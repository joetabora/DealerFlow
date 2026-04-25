/**
 * Prefer a path segment that exactly matches a known stock (folder-per-stock),
 * e.g. U612099-MKE/1.jpg, export/U612099-MKE/2.jpg, then filename prefix.
 */
export function resolveStockForMedia(
  webkitPath: string,
  baseFileName: string,
  skus: string[],
): string | null {
  const set = new Set(skus);
  for (const seg of webkitPath.split(/[\\/]+/).filter(Boolean)) {
    if (set.has(seg)) return seg;
  }
  return matchFilenameToStock(baseFileName, skus);
}

/**
 * Map a filename to a stock number. Longest match wins (e.g. U612099-MKE before U6120).
 * Filename should start with the exact stock, e.g. U612099-MKE-1.jpg, U612099_MKE-01.mp4
 */
export function matchFilenameToStock(
  fileName: string,
  skus: string[],
): string | null {
  const base = fileName.split(/[\\/]/).pop() || fileName;
  const ordered = [...skus].sort((a, b) => b.length - a.length);
  for (const sku of ordered) {
    if (base.startsWith(sku)) return sku;
  }
  return null;
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);
}

export function safeStorageFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
