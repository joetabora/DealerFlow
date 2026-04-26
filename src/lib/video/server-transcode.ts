import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";

function ffmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (typeof ffmpegStatic === "string" && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

/**
 * 720p H.264 CRF 28, AAC. Output MP4 (fast start for web).
 */
export function transcodeVideo720p(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const bin = ffmpegPath();
  if (!bin) {
    return Promise.reject(
      new Error("FFmpeg binary not found. Set FFMPEG_PATH or install ffmpeg-static."),
    );
  }
  const args = [
    "-y",
    "-i",
    inputPath,
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
    outputPath,
  ];
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr?.on("data", (b) => {
      err += b.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `ffmpeg exited with ${code}. ${err.slice(-2000) || "no stderr"}`,
          ),
        );
    });
  });
}

export function tempOutPath(suffix: string): string {
  const d = process.env.TMPDIR || tmpdir();
  return join(
    d,
    `df-video-${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`,
  );
}

export async function removeIfExists(p: string): Promise<void> {
  try {
    if (existsSync(p)) await unlink(p);
  } catch {
    /* ignore */
  }
}

export function isFfmpegAvailable(): boolean {
  return ffmpegPath() != null;
}
