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

/** Distinct `bike-media` object paths for a media row (image + video original/compressed). */
export function storagePathsForMediaRow(row: {
  file_url: string;
  original_url?: string | null;
  compressed_url?: string | null;
}): string[] {
  const urls = [row.file_url, row.original_url, row.compressed_url].filter(
    (u): u is string => Boolean(u),
  );
  const paths = new Set<string>();
  for (const url of urls) {
    const p = publicUrlToStoragePath(url);
    if (p) paths.add(p);
  }
  return [...paths];
}
