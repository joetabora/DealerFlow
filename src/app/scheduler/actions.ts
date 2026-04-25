"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LocationFilter, PostStatus } from "@/types/scheduler";

export type PostRowOut = {
  id: string;
  bike_id: string;
  scheduled_date: string;
  status: string;
  title: string | null;
  price: string | null;
  location: string | null;
  thumb: string | null;
};

function matchesLocation(
  loc: string | null,
  f: LocationFilter,
): boolean {
  if (f === "all") return true;
  const l = (loc ?? "").toLowerCase();
  if (f === "milwaukee") return l.includes("milwaukee");
  if (f === "west-bend") return l.includes("west") && l.includes("bend");
  return true;
}

export type PostsResult = { ok: true; weekStart: string; weekEnd: string; posts: PostRowOut[] } | { ok: false; error: string };

/**
 * Fetches all draft/scheduled posts in [weekFrom, weekTo) with bike fields and first image.
 */
export async function getSchedulerPosts(
  weekFromIso: string,
  weekToIso: string,
): Promise<PostsResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase
    .from("posts")
    .select("id, bike_id, scheduled_date, status, bikes ( title, price, location )")
    .gte("scheduled_date", weekFromIso)
    .lt("scheduled_date", weekToIso)
    .in("status", ["draft", "scheduled"]);

  if (error) return { ok: false, error: error.message };

  const raw = (data ?? []) as {
    id: string;
    bike_id: string;
    scheduled_date: string;
    status: string;
    bikes:
      | { title: string | null; price: string | null; location: string | null }
      | { title: string | null; price: string | null; location: string | null }[]
      | null;
  }[];

  const bikeIds = [...new Set(raw.map((p) => p.bike_id))];
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

  const posts: PostRowOut[] = raw.map((p) => {
    const b = Array.isArray(p.bikes) ? p.bikes[0]! : p.bikes ?? null;
    return {
      id: p.id,
      bike_id: p.bike_id,
      scheduled_date: p.scheduled_date,
      status: p.status,
      title: b?.title ?? null,
      price: b?.price ?? null,
      location: b?.location ?? null,
      thumb: thumbByBike.get(p.bike_id) ?? null,
    };
  });

  return {
    ok: true,
    weekStart: weekFromIso,
    weekEnd: weekToIso,
    posts,
  };
}

type ApplyCell = {
  bikeId: string;
  status: PostStatus;
  /** Full ISO for this slot, computed in the browser. */
  scheduledAt: string;
} | null;

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Replaces the week: deletes all draft/scheduled in the range, then batch-inserts the given slots.
 */
export async function applyWeek(
  weekFromIso: string,
  weekToIso: string,
  flat: ApplyCell[],
): Promise<ActionResult> {
  if (flat.length !== 28) {
    return { ok: false, error: "Invalid schedule length." };
  }
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { error: de } = await supabase
    .from("posts")
    .delete()
    .gte("scheduled_date", weekFromIso)
    .lt("scheduled_date", weekToIso)
    .in("status", ["draft", "scheduled"]);
  if (de) return { ok: false, error: de.message };

  const rows: {
    bike_id: string;
    scheduled_date: string;
    status: string;
    platforms: string[];
  }[] = [];
  for (const c of flat) {
    if (!c) continue;
    rows.push({
      bike_id: c.bikeId,
      scheduled_date: c.scheduledAt,
      status: c.status,
      platforms: [],
    });
  }
  if (rows.length === 0) {
    revalidatePath("/");
    revalidatePath("/scheduler");
    return { ok: true };
  }
  const { error: ins } = await supabase.from("posts").insert(rows);
  if (ins) {
    if (ins.message.includes("unique") || ins.code === "23505") {
      return {
        ok: false,
        error:
          "Each bike can only have one post per calendar day. Check that no day has the same bike twice.",
      };
    }
    return { ok: false, error: ins.message };
  }
  revalidatePath("/");
  revalidatePath("/scheduler");
  return { ok: true };
}

export async function clearWeek(
  weekFromIso: string,
  weekToIso: string,
): Promise<ActionResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { error } = await supabase
    .from("posts")
    .delete()
    .gte("scheduled_date", weekFromIso)
    .lt("scheduled_date", weekToIso)
    .in("status", ["draft", "scheduled"]);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/scheduler");
  return { ok: true };
}

type BikeRow = { id: string; title: string | null; price: string | null; location: string | null };

export type ListBikesResult = { ok: true; bikes: BikeRow[] } | { ok: false; error: string };

export async function listBikesForSchedule(
  location: LocationFilter,
): Promise<ListBikesResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase
    .from("bikes")
    .select("id, title, price, location, status, created_at")
    .eq("status", "available")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  const all = (data ?? []) as BikeRow[];
  const bikes = all.filter((b) => matchesLocation(b.location, location));
  return { ok: true, bikes };
}
