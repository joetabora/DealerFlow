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
 * iPhone / multi-mapped HEIC can expose a small preview on page 0. Pick the
 * page with the largest pixel count (full-resolution main image).
 */
async function pagePixelCount(
  input: Buffer,
  page: number,
): Promise<{ px: number; w: number; h: number }> {
  const m = await sharp(input, { failOn: "none", page, pages: 1 }).metadata();
  const w = m.width ?? 0;
  const h = m.height ?? 0;
  return { px: w * h, w, h };
}

async function pickLargestHeifPageIndex(input: Buffer): Promise<number> {
  let top: Metadata;
  try {
    top = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    return 0;
  }
  const reported = top.pages;
  const n = reported && reported > 0 ? reported : 1;
  let best = 0;
  let bestPx = 0;
  for (let p = 0; p < n; p++) {
    try {
      const { px } = await pagePixelCount(input, p);
      if (px > bestPx) {
        bestPx = px;
        best = p;
      }
    } catch {
      /* skip */
    }
  }
  if (bestPx < 400 * 300 && input.length > 200 * 1024) {
    for (let p = n; p < 12; p++) {
      try {
        const { px } = await pagePixelCount(input, p);
        if (px > bestPx) {
          bestPx = px;
          best = p;
        }
      } catch {
        break;
      }
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
