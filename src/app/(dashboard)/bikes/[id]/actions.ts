"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BIKE_MEDIA_BUCKET, storagePathsForMediaRow } from "@/lib/video/bucket";

export type DeleteMediaResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteBikeMedia(
  mediaId: string,
  bikeId: string,
): Promise<DeleteMediaResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Server not configured" };
  }

  const { data: row, error: qe } = await supabase
    .from("media")
    .select("id, bike_id, file_url, original_url, compressed_url")
    .eq("id", mediaId)
    .eq("bike_id", bikeId)
    .maybeSingle();

  if (qe) {
    return { ok: false, error: qe.message };
  }
  if (!row) {
    return { ok: false, error: "Media not found" };
  }

  const paths = storagePathsForMediaRow(row);
  if (paths.length > 0) {
    const { error: se } = await supabase.storage
      .from(BIKE_MEDIA_BUCKET)
      .remove(paths);
    if (se) {
      return { ok: false, error: se.message };
    }
  }

  const { error: de } = await supabase.from("media").delete().eq("id", mediaId);
  if (de) {
    return { ok: false, error: de.message };
  }

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath("/inventory");
  return { ok: true };
}
