import { NextResponse } from "next/server";
import { isPublicSupabaseObjectUrl } from "@/lib/media/heic-source-allowlist";

/**
 * Same-origin fetch of public Supabase storage files as HEIC, avoiding browser
 * CORS / opaque-response issues that break client-side heic2any.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
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

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "image/heic";
  const buf = await res.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
