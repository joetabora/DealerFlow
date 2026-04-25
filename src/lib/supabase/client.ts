import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "./env";

export function createClient() {
  const { url, key } = getPublicSupabaseConfig();
  return createBrowserClient(url, key);
}
