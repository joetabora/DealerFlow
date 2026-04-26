import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import sharp, { type Metadata } from "sharp";
import ffmpegStatic from "ffmpeg-static";
import {
  removeIfExists,
  tempOutPath,
} from "@/lib/video/server-transcode";

/**
 * If HEIF has multiple image items, use the one with the largest area. Only
 * pages reported by libvips are considered (no extra probes that can pick
 * non-image layers and hurt quality).
 */
async function pickLargestHeifPageIndex(input: Buffer): Promise<number> {
  let top: Metadata;
  try {
    top = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    return 0;
  }
  const n = top.pages;
  if (n == null || n <= 1) {
    return 0;
  }
  let best = 0;
  let bestArea = 0;
  for (let p = 0; p < n; p++) {
    try {
      const m = await sharp(input, { failOn: "none", page: p, pages: 1 }).metadata();
      const w = m.width ?? 0;
      const h = m.height ?? 0;
      const area = w * h;
      if (area > bestArea) {
        bestArea = area;
        best = p;
      }
    } catch {
      /* skip */
    }
  }
  return best;
}

function ffmpegBin(): string | null {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (typeof ffmpegStatic === "string" && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

/** Some ffmpeg builds lack libheif; used when sharp cannot decode. */
export async function heicBufferToJpgWithFfmpeg(
  buf: Buffer,
): Promise<Buffer | null> {
  const bin = ffmpegBin();
  if (!bin) return null;
  const inP = tempOutPath(".heic");
  const outP = tempOutPath(".jpg");
  try {
    await writeFile(inP, buf);
    await new Promise<void>((resolve, reject) => {
      const p = spawn(
        bin,
        ["-y", "-i", inP, "-frames:v", "1", "-q:v", "2", outP],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let err = "";
      p.stderr?.on("data", (b) => {
        err += b.toString();
      });
      p.on("error", reject);
      p.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(err.slice(-800) || `exit ${code}`));
      });
    });
    return await readFile(outP);
  } catch {
    return null;
  } finally {
    await removeIfExists(inP);
    await removeIfExists(outP);
  }
}

/**
 * HEIC/HEIF (and other raster) → JPEG via libvips, ffmpeg fallback. Quality 50–100.
 */
export async function decodeImageBufferToJpeg(
  input: Buffer,
  quality: number,
): Promise<Buffer> {
  const q = Math.min(100, Math.max(50, quality));
  const page = await pickLargestHeifPageIndex(input);
  const sharpInput = {
    failOn: "none" as const,
    page,
    pages: 1,
    limitInputPixels: false,
  };
  let jpeg: Buffer | null = null;
  try {
    jpeg = await sharp(input, sharpInput)
      .rotate()
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.warn("[decode-to-jpeg] sharp failed, trying ffmpeg", e);
    jpeg = await heicBufferToJpgWithFfmpeg(input);
  }
  if (!jpeg || jpeg.length === 0) {
    const err = new Error("Could not decode image to JPEG");
    throw err;
  }
  return jpeg;
}
