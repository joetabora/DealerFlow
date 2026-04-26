import type { SupabaseClient } from "@supabase/supabase-js";
import { transcodeVideoInBrowser } from "@/lib/video/client-transcode";
import { SUPABASE_STORAGE_SIZE_HINT } from "@/lib/video/upload-policy";

export type StoreBrowser720pResult =
  | { ok: true; mediaId: string; publicUrl: string }
  | { ok: false; error: string };

/**
 * Transcode in the browser, upload a single 720p MP4, mark media `ready`
 * (no full original in storage—avoids project upload limits).
 */
export async function store720pFromBrowser(
  s: SupabaseClient,
  opts: {
    bikeId: string;
    sku: string;
    objectName: string;
    file: File;
    maxOutputBytes: number;
  },
): Promise<StoreBrowser720pResult> {
  let blob: Blob;
  try {
    blob = await transcodeVideoInBrowser(opts.file);
  } catch (e) {
    const m = e instanceof Error ? e.message : "Transcode failed";
    return { ok: false, error: `${m} ${SUPABASE_STORAGE_SIZE_HINT}` };
  }
  if (blob.size > opts.maxOutputBytes) {
    return {
      ok: false,
      error: `After 720p compression, the file is still over your upload cap (~${(opts.maxOutputBytes / (1024 * 1024)).toFixed(0)}MB). ${SUPABASE_STORAGE_SIZE_HINT}`,
    };
  }
  const compPath = `${encodeURIComponent(opts.sku)}/c-${opts.objectName}.mp4`;
  const { error: upC } = await s.storage
    .from("bike-media")
    .upload(compPath, blob, {
      upsert: true,
      contentType: "video/mp4",
    });
  if (upC) {
    if (/exceeded|maximum|too large|size/i.test(upC.message)) {
      return { ok: false, error: `${upC.message} ${SUPABASE_STORAGE_SIZE_HINT}` };
    }
    return { ok: false, error: upC.message };
  }
  const { data: cPub } = s.storage.from("bike-media").getPublicUrl(compPath);
  const { data: insRow, error: ins } = await s
    .from("media")
    .insert({
      bike_id: opts.bikeId,
      file_url: cPub.publicUrl,
      type: "video",
      status: "ready",
      original_url: null,
      compressed_url: cPub.publicUrl,
    })
    .select("id")
    .single();
  if (ins) {
    return { ok: false, error: ins.message };
  }
  return { ok: true, mediaId: (insRow as { id: string }).id, publicUrl: cPub.publicUrl };
}
