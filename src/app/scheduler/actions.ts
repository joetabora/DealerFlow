"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ApplyCell } from "@/lib/schedule-apply";
import { hasPairwiseConflictInBatch, inCooldown } from "@/lib/scheduling-cooldown";
import {
  aggregateByCanonicalHour,
  buildSmartHoursByDay,
  defaultHoursByDay,
  getDealerTimeZone,
} from "@/lib/post-timing";
import { renderDefaultCaption } from "@/lib/caption-template";
import { getMonday, localDayIndexInWeek } from "@/lib/week";
import type { LocationFilter, SchedulerCell } from "@/types/scheduler";
import type { AnchorPost } from "@/lib/scheduling-cooldown";

export type PostRowOut = {
  id: string;
  bike_id: string;
  scheduled_date: string;
  status: string;
  title: string | null;
  price: string | null;
  location: string | null;
  thumb: string | null;
  caption: string | null;
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

export type PostsResult =
  | { ok: true; weekStart: string; weekEnd: string; posts: PostRowOut[] }
  | { ok: false; error: string };

/**
 * Fetches draft/scheduled posts in [weekFrom, weekTo) with bike fields, caption, and first image.
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
    .select("id, bike_id, scheduled_date, status, caption, bikes ( title, price, location )")
    .gte("scheduled_date", weekFromIso)
    .lt("scheduled_date", weekToIso)
    .in("status", ["draft", "scheduled"]);

  if (error) return { ok: false, error: error.message };

  const raw = (data ?? []) as {
    id: string;
    bike_id: string;
    scheduled_date: string;
    status: string;
    caption: string | null;
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
      caption: p.caption,
    };
  });

  return {
    ok: true,
    weekStart: weekFromIso,
    weekEnd: weekToIso,
    posts,
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function validateBatchCooldown(
  newRows: { bike_id: string; scheduled_date: string }[],
  existing: { bike_id: string; scheduled_date: string }[],
): { ok: true } | { ok: false; error: string } {
  const batch = newRows.map((r) => ({
    bikeId: r.bike_id,
    t: new Date(r.scheduled_date).getTime(),
  }));
  if (hasPairwiseConflictInBatch(batch)) {
    return {
      ok: false,
      error:
        "Each bike can only be scheduled once every 14 days. Adjust the week so the same unit is not used twice in that window.",
    };
  }
  for (const r of newRows) {
    const tNew = new Date(r.scheduled_date).getTime();
    for (const e of existing) {
      if (e.bike_id !== r.bike_id) continue;
      const tOld = new Date(e.scheduled_date).getTime();
      if (tOld > 0 && inCooldown(tNew, tOld)) {
        return {
          ok: false,
          error:
            "A bike is within 14 days of another post. Choose a different day or another unit.",
        };
      }
    }
  }
  return { ok: true };
}

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

  const rows: {
    bike_id: string;
    scheduled_date: string;
    status: string;
    platforms: string[];
    caption: string | null;
  }[] = [];
  for (const c of flat) {
    if (!c) continue;
    rows.push({
      bike_id: c.bikeId,
      scheduled_date: c.scheduledAt,
      status: c.status,
      platforms: [],
      caption: c.caption?.trim() || null,
    });
  }

  const bikeIds = [...new Set(rows.map((r) => r.bike_id))];
  if (rows.length > 0) {
    const { data: allP, error: eAll } = await supabase
      .from("posts")
      .select("bike_id, scheduled_date, status")
      .in("bike_id", bikeIds);
    if (eAll) return { ok: false, error: eAll.message };
    const wf = new Date(weekFromIso).getTime();
    const wte = new Date(weekToIso).getTime();
    const blockers = (allP ?? []).filter((p) => {
      const t = new Date(p.scheduled_date as string).getTime();
      if (p.status === "posted") return true;
      const inOpenWeek = t >= wf && t < wte;
      if (inOpenWeek && (p.status === "draft" || p.status === "scheduled")) {
        return false;
      }
      return true;
    }) as { bike_id: string; scheduled_date: string }[];
    const v = validateBatchCooldown(
      rows.map((r) => ({ bike_id: r.bike_id, scheduled_date: r.scheduled_date })),
      blockers,
    );
    if (!v.ok) return v;
  }

  const { error: de } = await supabase
    .from("posts")
    .delete()
    .gte("scheduled_date", weekFromIso)
    .lt("scheduled_date", weekToIso)
    .in("status", ["draft", "scheduled"]);
  if (de) return { ok: false, error: de.message };

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

export type SlotPlanResult =
  | { ok: true; hoursByDay: number[][] }
  | { ok: false; error: string };

/**
 * Builds 7×4 local clock hours (phase 1: 9/12/3/7 daily; phase 3 with posted history).
 */
export async function getSlotPlan(): Promise<SlotPlanResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: true, hoursByDay: defaultHoursByDay() };
  }

  const tz = getDealerTimeZone();
  const { data, error } = await supabase
    .from("posts")
    .select("scheduled_date, posted_at, likes, comments, status")
    .eq("status", "posted");

  if (error) {
    return { ok: true, hoursByDay: defaultHoursByDay() };
  }

  const rows = (data ?? []) as {
    scheduled_date: string;
    posted_at: string | null;
    likes: number | null;
    comments: number | null;
  }[];

  const samples = rows
    .map((r) => {
      const effectiveAt = r.posted_at ?? r.scheduled_date;
      if (!effectiveAt) return null;
      return {
        effectiveAt,
        likes: r.likes ?? 0,
        comments: r.comments ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const byHour = aggregateByCanonicalHour(samples, tz);
  const hoursByDay = buildSmartHoursByDay(byHour, samples.length);
  return { ok: true, hoursByDay };
}

type BikeRow = {
  id: string;
  title: string | null;
  price: string | null;
  location: string | null;
  post_count: number;
  last_posted_at: string | null;
  media: { count: number }[] | { count: number } | null;
};

export type ListBikesResult =
  | { ok: true; bikes: BikeRow[]; anchorPosts: AnchorPost[] }
  | { ok: false; error: string };

function mediaCount(b: BikeRow): number {
  const m = b.media;
  if (m == null) return 0;
  if (Array.isArray(m)) {
    return typeof m[0]?.count === "number" ? m[0]!.count : 0;
  }
  return typeof m.count === "number" ? m.count : 0;
}

export type AnchorExclusion =
  | { type: "replaceEntireWorkWeek" }
  | { type: "replaceDayInWeek"; dayIndex: number };

function toAnchorRows(
  rows: { bike_id: string; scheduled_date: string; status: string }[],
  weekFromIso: string,
  weekToIso: string,
  ex: AnchorExclusion,
): AnchorPost[] {
  const monday = getMonday(new Date(weekFromIso));
  const wf = new Date(weekFromIso).getTime();
  const wt = new Date(weekToIso).getTime();
  const out: AnchorPost[] = [];
  for (const p of rows) {
    if (p.status === "posted") {
      out.push({ bike_id: p.bike_id, scheduled_date: p.scheduled_date });
      continue;
    }
    const t = new Date(p.scheduled_date);
    const ti = t.getTime();
    if (ti < wf || ti >= wt) {
      out.push({ bike_id: p.bike_id, scheduled_date: p.scheduled_date });
      continue;
    }
    if (ex.type === "replaceEntireWorkWeek") {
      continue;
    }
    const d = localDayIndexInWeek(monday, t);
    if (d !== ex.dayIndex) {
      out.push({ bike_id: p.bike_id, scheduled_date: p.scheduled_date });
    }
  }
  return out;
}

/**
 * Available bikes with at least one media, ordered for scheduling; anchor posts for cooldown simulation.
 */
export async function listBikesForSchedule(
  weekFromIso: string,
  weekToIso: string,
  location: LocationFilter,
  anchorExclusion: AnchorExclusion,
): Promise<ListBikesResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase
    .from("bikes")
    .select("id, title, price, location, post_count, last_posted_at, media(count)")
    .eq("status", "available");
  if (error) return { ok: false, error: error.message };
  const all = (data ?? []) as BikeRow[];
  const withMedia = all
    .filter((b) => mediaCount(b) > 0)
    .filter((b) => matchesLocation(b.location, location));
  withMedia.sort((a, b) => {
    if (a.post_count !== b.post_count) return a.post_count - b.post_count;
    const aL = a.last_posted_at ? new Date(a.last_posted_at).getTime() : 0;
    const bL = b.last_posted_at ? new Date(b.last_posted_at).getTime() : 0;
    if (aL !== bL) {
      if (!a.last_posted_at) return -1;
      if (!b.last_posted_at) return 1;
      return aL - bL;
    }
    return (a.title ?? "").localeCompare(b.title ?? "");
  });

  const candidateIds = withMedia.map((b) => b.id);
  let anchorPosts: AnchorPost[] = [];
  if (candidateIds.length > 0) {
    const { data: pRows, error: pErr } = await supabase
      .from("posts")
      .select("bike_id, scheduled_date, status")
      .in("bike_id", candidateIds);
    if (pErr) return { ok: false, error: pErr.message };
    anchorPosts = toAnchorRows(
      (pRows ?? []) as { bike_id: string; scheduled_date: string; status: string }[],
      weekFromIso,
      weekToIso,
      anchorExclusion,
    );
  }

  return { ok: true, bikes: withMedia, anchorPosts };
}

export type UpdateEngagementResult = { ok: true } | { ok: false; error: string };

export async function updatePostEngagement(
  postId: string,
  likes: number,
  comments: number,
): Promise<UpdateEngagementResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const li = Math.max(0, Math.floor(likes));
  const co = Math.max(0, Math.floor(comments));
  const { error } = await supabase
    .from("posts")
    .update({ likes: li, comments: co })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/leaderboard");
  return { ok: true };
}

export type UpdateCaptionResult = { ok: true } | { ok: false; error: string };

export async function updatePostCaption(
  postId: string,
  caption: string,
): Promise<UpdateCaptionResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { error } = await supabase
    .from("posts")
    .update({ caption: caption.trim() || null })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/scheduler");
  return { ok: true };
}

/**
 * One scheduler card worth of data for a bike (first empty slot + persist).
 */
export async function getSchedulerPayloadForBike(
  bikeId: string,
): Promise<
  { ok: true; cell: SchedulerCell } | { ok: false; error: string }
> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data: b, error } = await supabase
    .from("bikes")
    .select("id, title, price, location")
    .eq("id", bikeId)
    .eq("status", "available")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!b) {
    return { ok: false, error: "Bike not found or not in inventory." };
  }
  const bike = b as {
    id: string;
    title: string | null;
    price: string | null;
    location: string | null;
  };
  const { data: mrows } = await supabase
    .from("media")
    .select("id, file_url, type, created_at")
    .eq("bike_id", bikeId)
    .order("created_at", { ascending: true });
  const firstImg = (mrows as { file_url: string; type: string }[] | null)?.find(
    (m) => m.type === "image",
  );
  if (!mrows?.length) {
    return {
      ok: false,
      error: "Add at least one photo or video to this unit before scheduling.",
    };
  }
  const title = bike.title?.trim() || "Untitled";
  const price = bike.price?.trim() ?? "—";
  const cell: SchedulerCell = {
    postId: "",
    bikeId: bike.id,
    title,
    price,
    location: bike.location?.trim() ?? null,
    thumbUrl: firstImg?.file_url ?? null,
    status: "draft",
    caption: renderDefaultCaption({
      title,
      price,
      location: bike.location,
    }),
  };
  return { ok: true, cell };
}
