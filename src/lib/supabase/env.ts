/**
 * Public Supabase config for browser + server clients.
 * New projects use "Publishable" keys (sb_publishable_…); older docs use ANON (often eyJ…).
 * Either env var is accepted.
 */
export function getPublicSupabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new sb_publishable_… key from the dashboard).",
    );
  }
  return { url, key };
}
