"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BIKE_MEDIA_BUCKET, storagePathsForMediaRow } from "@/lib/video/bucket";

export type SimpleAction =
  | { ok: true; updated?: number; removed?: boolean }
  | { ok: false; error: string };

/**
 * Sets every `sold` bike to `available` so they show on the default Inventory tab again.
 */
export async function restoreAllSoldBikesToAvailable(): Promise<SimpleAction> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Server not configured" };
  }

  const { data, error } = await supabase
    .from("bikes")
    .update({ status: "available" })
    .eq("status", "sold")
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }

  const n = Array.isArray(data) ? data.length : 0;
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/scheduler");

  return { ok: true, updated: n };
}

const REMOVE_CHUNK = 40;

export async function deleteBikeCompletely(bikeId: string): Promise<SimpleAction> {
  const id = bikeId?.trim();
  if (!id) {
    return { ok: false, error: "Missing bike." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Server not configured" };
  }

  const { data: bike, error: be } = await supabase
    .from("bikes")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (be || !bike) {
    return { ok: false, error: "Bike not found or already removed." };
  }

  const { data: mediaRows, error: me } = await supabase
    .from("media")
    .select("file_url, original_url, compressed_url")
    .eq("bike_id", id);

  if (me) {
    return { ok: false, error: me.message };
  }

  const paths = new Set<string>();
  for (const row of (mediaRows ?? []) as {
    file_url: string;
    original_url: string | null;
    compressed_url: string | null;
  }[]) {
    for (const p of storagePathsForMediaRow(row)) {
      paths.add(p);
    }
  }

  const list = [...paths];
  for (let i = 0; i < list.length; i += REMOVE_CHUNK) {
    const chunk = list.slice(i, i + REMOVE_CHUNK);
    const { error: se } = await supabase.storage
      .from(BIKE_MEDIA_BUCKET)
      .remove(chunk);
    if (se && list.length > 0) {
      console.warn("[deleteBikeCompletely] storage remove:", se.message);
    }
  }

  const { error: de } = await supabase.from("bikes").delete().eq("id", id);
  if (de) {
    return { ok: false, error: de.message };
  }

  revalidatePath("/inventory");
  revalidatePath(`/bikes/${id}`);
  revalidatePath("/");
  revalidatePath("/scheduler");
  revalidatePath("/leaderboard");

  return { ok: true, removed: true };
}
