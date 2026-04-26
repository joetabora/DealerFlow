import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import { isPublicSupabaseObjectUrl } from "@/lib/media/heic-source-allowlist";
import {
  removeIfExists,
  tempOutPath,
} from "@/lib/video/server-transcode";

export const runtime = "nodejs";

function ffmpegBin(): string | null {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (typeof ffmpegStatic === "string" && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

/** Some ffmpeg builds lack libheif; try anyway if sharp cannot decode. */
async function heicToJpegWithFfmpeg(buf: Buffer): Promise<Buffer | null> {
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
 * Decode HEIC/HEIF to JPEG on the server (libvips via sharp). Browsers often cannot
 * show iPhone HEIC even with heic2any WASM; this path matches Photos / macOS behavior.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const qRaw = searchParams.get("q");
  const q = Math.min(
    100,
    Math.max(50, Number(qRaw) || 86),
  );

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!isPublicSupabaseObjectUrl(url)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream ${res.status}` },
      { status: 502 },
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());

  let jpeg: Buffer | null = null;
  try {
    jpeg = await sharp(buf, { failOn: "none" })
      .rotate()
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.warn("[heic-preview] sharp failed, trying ffmpeg", e);
    jpeg = await heicToJpegWithFfmpeg(buf);
  }

  if (!jpeg || jpeg.length === 0) {
    return NextResponse.json(
      { error: "Could not decode HEIC" },
      { status: 422 },
    );
  }

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
