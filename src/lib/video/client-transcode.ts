/**
 * Browser-side 720p transcode (ffmpeg.wasm). Loaded from unpkg on first use.
 * Used when a file is over `NEXT_PUBLIC_MAX_DIRECT_VIDEO_UPLOAD_MB`, on
 * NEXT_PUBLIC_USE_CLIENT_FFMPEG=1, or when Supabase rejects the direct upload as too large.
 */
export function useClientFfmpegEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_CLIENT_FFMPEG === "1";
}

export type TranscodeProgress = (phase: "load" | "run", p?: number) => void;

/**
 * 720p H.264 CRF 28, AAC into MP4 (faststart).
 */
export async function transcodeVideoInBrowser(
  file: File,
  onProgress?: TranscodeProgress,
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
  onProgress?.("load", 0);
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm");
  const ff = new FFmpeg();
  await ff.load({ coreURL, wasmURL } as { coreURL: string; wasmURL: string });
  onProgress?.("run", 0.1);
  const name = "input" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mp4");
  const out = "out.mp4";
  await ff.writeFile(name, await fetchFile(file));
  await ff.exec([
    "-i",
    name,
    "-vf",
    "scale=-2:720",
    "-c:v",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "medium",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    out,
  ]);
  const data = (await ff.readFile(out)) as Uint8Array;
  return new Blob([data as BlobPart], { type: "video/mp4" });
}
