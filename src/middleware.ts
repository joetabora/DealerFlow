import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  tryPublicSupabaseConfig,
  requireLoginInMiddleware,
  skipLoginInMiddleware,
} from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const conf = tryPublicSupabaseConfig();
  const res = NextResponse.next({ request });
  if (!conf) return res;

  const supabase = createServerClient(conf.url, conf.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicRoute = path === "/login" || path.startsWith("/auth/");

  if (requireLoginInMiddleware() && !skipLoginInMiddleware()) {
    if (!user && !publicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user && path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
