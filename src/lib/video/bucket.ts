export const BIKE_MEDIA_BUCKET = "bike-media";

/**
 * Public object path for Supabase public URL, e.g. "SKU/file.mp4" (decoded).
 */
export function publicUrlToStoragePath(
  publicUrl: string,
  bucket: string = BIKE_MEDIA_BUCKET,
): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}
