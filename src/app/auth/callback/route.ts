import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { tryPublicSupabaseConfig } from "@/lib/supabase/env";

/**
 * Handles Supabase OAuth / PKCE redirects (magic link, OTP, federated login).
 */
export async function GET(request: NextRequest) {
  const base = new URL(request.url);
  const conf = tryPublicSupabaseConfig();
  if (!conf) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const code = base.searchParams.get("code");
  const next = base.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(conf.url, conf.key, {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login", base));
  }

  return NextResponse.redirect(new URL(safeNext, base.origin));
}
