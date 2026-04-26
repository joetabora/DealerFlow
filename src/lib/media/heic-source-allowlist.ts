import { getPublicSupabaseConfig } from "@/lib/supabase/env";

/**
 * Server-side: only allow fetching HEIC/HEIF from this app’s public Supabase storage URLs
 * (avoids SSRF via /api/media/heic-source?url=…).
 */
export function isPublicSupabaseObjectUrl(objectUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(objectUrl);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  let base: string;
  try {
    base = getPublicSupabaseConfig().url;
  } catch {
    return false;
  }
  const allowed = new URL(base);
  if (u.hostname.toLowerCase() !== allowed.hostname.toLowerCase()) return false;
  return u.pathname.startsWith("/storage/v1/object/public/");
}
