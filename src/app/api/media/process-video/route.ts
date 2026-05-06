import { after } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import { runVideoTranscodeJob } from "@/lib/video/process-video-job";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts a queued video job. Returns 202 immediately; work runs in `after` (non-blocking).
 */
export async function POST(req: Request) {
  let url: string;
  let key: string;
  try {
    const c = getPublicSupabaseConfig();
    url = c.url;
    key = c.key;
  } catch {
    return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          //
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && process.env.NEXT_PUBLIC_SKIP_LOGIN !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const mediaId =
    body &&
    typeof body === "object" &&
    "mediaId" in body &&
    typeof (body as { mediaId: unknown }).mediaId === "string"
      ? (body as { mediaId: string }).mediaId
      : null;
  if (!mediaId) {
    return Response.json({ error: "mediaId required" }, { status: 400 });
  }

  after(async () => {
    try {
      await runVideoTranscodeJob(mediaId);
    } catch (e) {
      console.error("[api/process-video] after():", e);
    }
  });

  return new Response(null, { status: 202 });
}
