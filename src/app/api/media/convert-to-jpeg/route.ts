import { NextResponse } from "next/server";
import { decodeImageBufferToJpeg } from "@/lib/media/decode-to-jpeg-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** iPhone HEICs can be large; Vercel may still cap body size. */
const MAX_BYTES = 45 * 1024 * 1024;

/**
 * POST multipart: field `file` (HEIC/HEIF) → body is JPEG. Used on upload so storage
 * only receives .jpg, matching sharp/Photos — more reliable than browser heic2any.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = Math.min(100, Math.max(50, Number(searchParams.get("q")) || 90));

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request body too large or invalid" },
      { status: 413 },
    );
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 45MB)" },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let jpeg: Buffer;
  try {
    jpeg = await decodeImageBufferToJpeg(buf, q);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not convert image to JPEG",
      },
      { status: 422 },
    );
  }

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: { "Content-Type": "image/jpeg" },
  });
}
