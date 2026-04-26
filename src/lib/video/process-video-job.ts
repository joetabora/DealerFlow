import { writeFile, readFile } from "node:fs/promises";
import { createClient } from "@/lib/supabase/server";
import { BIKE_MEDIA_BUCKET } from "@/lib/video/bucket";
import { removeIfExists, tempOutPath, transcodeVideo720p } from "@/lib/video/server-transcode";

type MediaRow = {
  id: string;
  bike_id: string;
  file_url: string;
  type: string;
  status: string;
  original_url: string | null;
  bikes: { sku: string } | { sku: string }[] | null;
};

/**
 * Transcode video to 720p H.264, upload compressed, update media row. Idempotent.
 */
export async function runVideoTranscodeJob(mediaId: string): Promise<void> {
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error("[process-video] no supabase", e);
    return;
  }

  const { data: row, error: qe } = await supabase
    .from("media")
    .select("id, bike_id, file_url, type, status, original_url, bikes ( sku )")
    .eq("id", mediaId)
    .maybeSingle();

  if (qe || !row) {
    console.error("[process-video] fetch media", qe);
    return;
  }

  const m = row as MediaRow;
  if (m.type !== "video" || m.status !== "processing") {
    return;
  }

  const sourceUrl = m.original_url ?? m.file_url;
  const inPath = tempOutPath("-in");
  const outPath = tempOutPath(".mp4");
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(inPath, buf);
    await transcodeVideo720p(inPath, outPath);
    const outBuf = await readFile(outPath);

    const b = m.bikes;
    const bike = Array.isArray(b) ? b[0] : b;
    const sku = bike?.sku?.trim();
    if (!sku) {
      throw new Error("Missing bike SKU for upload path");
    }
    const objectName = `c-${m.id}.mp4`;
    const compPath = `${encodeURIComponent(sku)}/${objectName}`;

    const { error: up } = await supabase.storage
      .from(BIKE_MEDIA_BUCKET)
      .upload(compPath, outBuf, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (up) throw new Error(up.message);

    const { data: pub } = supabase.storage
      .from(BIKE_MEDIA_BUCKET)
      .getPublicUrl(compPath);
    const compactUrl = pub.publicUrl;

    const { error: upDb } = await supabase
      .from("media")
      .update({
        status: "ready",
        compressed_url: compactUrl,
        file_url: compactUrl,
        processing_error: null,
      })
      .eq("id", mediaId)
      .eq("status", "processing");
    if (upDb) {
      console.error("[process-video] db update", upDb);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcode failed";
    console.error("[process-video]", mediaId, msg);
    await supabase
      .from("media")
      .update({ status: "failed", processing_error: msg })
      .eq("id", mediaId)
      .in("status", ["processing"]);
  } finally {
    await removeIfExists(inPath);
    await removeIfExists(outPath);
  }
}
