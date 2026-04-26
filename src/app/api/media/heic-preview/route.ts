import { NextResponse } from "next/server";
import { decodeImageBufferToJpeg } from "@/lib/media/decode-to-jpeg-server";
import { isPublicSupabaseObjectUrl } from "@/lib/media/heic-source-allowlist";

export const runtime = "nodejs";

/**
 * GET ?url= — decode HEIC/HEIF from public Supabase URL to JPEG (display path).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const qRaw = searchParams.get("q");
  const q = Math.min(100, Math.max(50, Number(qRaw) || 86));

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
  let jpeg: Buffer;
  try {
    jpeg = await decodeImageBufferToJpeg(buf, q);
  } catch {
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
