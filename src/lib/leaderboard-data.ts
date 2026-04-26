import { createClient } from "@/lib/supabase/server";
import {
  engagementScore,
  REPOST_COOLDOWN_DAYS,
  REPOST_SUGGESTION_MIN_SCORE,
} from "@/lib/engagement";

export type LeaderboardRow = {
  postId: string;
  bikeId: string;
  title: string;
  location: string;
  likes: number;
  comments: number;
  engagementScore: number;
  postedAtLabel: string;
  postedAtIso: string;
  thumbUrl: string | null;
  /** High engagement and past repost cooldown — good candidate to run again */
  showHotSuggestion: boolean;
};

function effectivePostedAt(postedAt: string | null, scheduledDate: string): Date {
  const d = new Date(postedAt ?? scheduledDate);
  return Number.isNaN(d.getTime()) ? new Date(scheduledDate) : d;
}

export async function getTopPerformingPosts(
  limit = 8,
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  const defaults = { rows: [] as LeaderboardRow[], error: null as string | null };
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ...defaults, error: "config" };
  }

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, bike_id, likes, comments, posted_at, scheduled_date, bikes ( title, location )",
    )
    .eq("status", "posted")
    .limit(120);

  if (error) {
    return { ...defaults, error: error.message };
  }

  const raw = (data ?? []) as unknown;

  const scored = (Array.isArray(raw) ? raw : [])
    .map((row) => {
      const p = row as {
        id: string;
        bike_id: string;
        likes: number | null;
        comments: number | null;
        posted_at: string | null;
        scheduled_date: string;
        bikes:
          | { title: string | null; location: string | null }
          | { title: string | null; location: string | null }[]
          | null;
      };
      const likes = p.likes ?? 0;
      const comments = p.comments ?? 0;
      const eng = engagementScore(likes, comments);
      const at = effectivePostedAt(p.posted_at, p.scheduled_date);
      const b = Array.isArray(p.bikes) ? p.bikes[0] : p.bikes;
      return {
        postId: p.id,
        bikeId: p.bike_id,
        title: b?.title?.trim() || "Untitled",
        location: b?.location?.trim() || "—",
        likes,
        comments,
        engagementScore: eng,
        at,
        postedAtIso: at.toISOString(),
      };
    })
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);

  const bikeIds = [...new Set(scored.map((r) => r.bikeId))];
  const thumbByBike = new Map<string, string | null>();
  if (bikeIds.length > 0) {
    const { data: mrows } = await supabase
      .from("media")
      .select("bike_id, file_url, created_at, type")
      .in("bike_id", bikeIds)
      .eq("type", "image")
      .order("created_at", { ascending: true });
    for (const row of (mrows ?? []) as { bike_id: string; file_url: string }[]) {
      if (!thumbByBike.has(row.bike_id)) {
        thumbByBike.set(row.bike_id, row.file_url);
      }
    }
  }

  const now = Date.now();
  const rows: LeaderboardRow[] = scored.map((r) => {
    const daysSince = (now - r.at.getTime()) / 86_400_000;
    const pastCooldown = daysSince > REPOST_COOLDOWN_DAYS;
    return {
      postId: r.postId,
      bikeId: r.bikeId,
      title: r.title,
      location: r.location,
      likes: r.likes,
      comments: r.comments,
      engagementScore: r.engagementScore,
      postedAtLabel: r.at.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      postedAtIso: r.postedAtIso,
      thumbUrl: thumbByBike.get(r.bikeId) ?? null,
      showHotSuggestion:
        r.engagementScore >= REPOST_SUGGESTION_MIN_SCORE && pastCooldown,
    };
  });

  return { rows, error: null };
}
