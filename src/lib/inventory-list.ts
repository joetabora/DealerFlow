import { createClient } from "@/lib/supabase/server";
import type { Bike } from "@/types/bike";

export type InventoryBike = Bike & {
  mediaCount: number;
  hasVideo: boolean;
  /** First image, or first video if no image */
  heroUrl: string | null;
  heroIsVideo: boolean;
};

function mediaCountFromRow(row: {
  media: { count: number }[] | { count: number } | null;
}): number {
  const m = row.media;
  if (m == null) return 0;
  if (Array.isArray(m)) {
    const c = m[0]?.count;
    return typeof c === "number" ? c : 0;
  }
  return typeof m.count === "number" ? m.count : 0;
}

type MediaRow = {
  bike_id: string;
  file_url: string;
  type: "image" | "video";
  created_at: string;
};

function buildMediaPreview(
  rows: MediaRow[] | null,
  bikeId: string,
): { hasVideo: boolean; heroUrl: string | null; heroIsVideo: boolean } {
  if (!rows?.length) {
    return { hasVideo: false, heroUrl: null, heroIsVideo: false };
  }
  const forBike = rows
    .filter((r) => r.bike_id === bikeId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  const hasVideo = forBike.some((r) => r.type === "video");
  const firstImage = forBike.find((r) => r.type === "image");
  if (firstImage) {
    return {
      hasVideo,
      heroUrl: firstImage.file_url,
      heroIsVideo: false,
    };
  }
  const firstVideo = forBike.find((r) => r.type === "video");
  if (firstVideo) {
    return { hasVideo: true, heroUrl: firstVideo.file_url, heroIsVideo: true };
  }
  return { hasVideo: false, heroUrl: null, heroIsVideo: false };
}

export async function getInventoryBikes(): Promise<
  | { ok: true; bikes: InventoryBike[] }
  | { ok: false; error: "config" | "query"; message?: string }
> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "config" };
  }

  const { data, error } = await supabase
    .from("bikes")
    .select(
      "id, sku, title, year, model, mileage, price, location, description, status, last_posted_at, post_count, created_at, media(count)",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: "query", message: error.message };
  }
  if (!data?.length) {
    return { ok: true, bikes: [] };
  }

  const base = (
    data as unknown as (Bike & { media: { count: number }[] | null })[]
  ).map((r) => {
    const { media, ...rest } = r;
    return {
      ...(rest as Bike),
      mediaCount: mediaCountFromRow({ media }),
    };
  });

  const ids = base.map((b) => b.id);
  const { data: mediaRows, error: mErr } = await supabase
    .from("media")
    .select("bike_id, file_url, type, created_at")
    .in("bike_id", ids)
    .order("created_at", { ascending: true });

  if (mErr) {
    return { ok: false, error: "query", message: mErr.message };
  }

  const mlist = (mediaRows as MediaRow[] | null) ?? [];

  const bikes: InventoryBike[] = base.map((b) => {
    const p = buildMediaPreview(mlist, b.id);
    return {
      ...b,
      hasVideo: p.hasVideo,
      heroUrl: p.heroUrl,
      heroIsVideo: p.heroIsVideo,
    };
  });

  return { ok: true, bikes };
}
