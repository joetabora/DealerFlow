"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REPOST_COOLDOWN_DAYS } from "@/lib/engagement";
import { findNextOpenSlot } from "@/lib/repost-schedule";

export type RepostResult =
  | { ok: true }
  | { ok: false; reason: "recent" | "not_found" | "error"; message: string };

type PostRow = {
  id: string;
  bike_id: string;
  status: string;
  posted_at: string | null;
  scheduled_date: string;
};

export async function repostBike(postId: string): Promise<RepostResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Supabase is not configured.",
    };
  }

  const { data: post, error: fe } = await supabase
    .from("posts")
    .select("id, bike_id, status, posted_at, scheduled_date")
    .eq("id", postId)
    .maybeSingle();

  if (fe || !post) {
    return { ok: false, reason: "not_found", message: "Post not found." };
  }
  const p = post as PostRow;
  if (p.status !== "posted") {
    return {
      ok: false,
      reason: "not_found",
      message: "Only posted content can be reposted.",
    };
  }

  const effective = new Date(p.posted_at ?? p.scheduled_date);
  if (Number.isNaN(effective.getTime())) {
    return { ok: false, reason: "error", message: "Invalid post date." };
  }
  if (Date.now() - effective.getTime() < REPOST_COOLDOWN_DAYS * 86_400_000) {
    return { ok: false, reason: "recent", message: "Recently posted" };
  }

  const slot = await findNextOpenSlot(supabase, p.bike_id);
  const { error: ins } = await supabase.from("posts").insert({
    bike_id: p.bike_id,
    scheduled_date: slot.toISOString(),
    status: "scheduled",
    platforms: [],
  });
  if (ins) {
    if (ins.code === "23505" || ins.message?.includes("unique")) {
      return {
        ok: false,
        reason: "error",
        message:
          "This bike already has a slot that day. Open the scheduler to adjust.",
      };
    }
    return { ok: false, reason: "error", message: ins.message };
  }
  revalidatePath("/");
  revalidatePath("/scheduler");
  return { ok: true };
}
