/**
 * Direct upload to Supabase Storage is limited per project (often 50MB on hosted).
 * Files larger than this should be compressed in the browser first so the stored
 * object stays under the limit.
 *
 * @see https://supabase.com/docs/guides/storage
 */
export function getMaxDirectVideoUploadBytes(): number {
  const env =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAX_DIRECT_VIDEO_UPLOAD_MB
      : undefined;
  if (env) {
    const n = parseFloat(env);
    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n * 1024 * 1024);
    }
  }
  // Default: 45MB — usually under a 50MB project cap, with a little headroom
  return 45 * 1024 * 1024;
}

export const SUPABASE_STORAGE_SIZE_HINT =
  "In Supabase: Project Settings → Storage (or the bucket) and raise the file size limit if you need larger uploads.";
