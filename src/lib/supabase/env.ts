/**
 * Public Supabase config for browser + server clients.
 * New projects use "Publishable" keys (sb_publishable_…); older docs use ANON (often eyJ…).
 * Either env var is accepted.
 */
export function tryPublicSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return { url: url.trim(), key: key.trim() };
}

export function getPublicSupabaseConfig(): { url: string; key: string } {
  const c = tryPublicSupabaseConfig();
  if (!c) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new sb_publishable_… key from the dashboard).",
    );
  }
  return c;
}

/** When unset or not "false", middleware requires a logged-in Supabase session (after DB RLS migration). */
export function requireLoginInMiddleware(): boolean {
  return process.env.NEXT_PUBLIC_REQUIRE_AUTH !== "false";
}

/** Development escape hatch: skips login redirects (RLS still applies if migration is applied). */
export function skipLoginInMiddleware(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_LOGIN === "1";
}
