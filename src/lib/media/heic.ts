const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export function isHeicFile(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t && HEIC_TYPES.has(t)) return true;
  return /\.hei[cf]$/i.test(file.name);
}

/** Convert HEIC/HEIF to a JPEG the browser can display everywhere. */
export async function heicToJpegBlob(
  file: File,
  quality = 0.9,
): Promise<Blob> {
  const { default: convert } = await import("heic2any");
  const r = await convert({
    blob: file,
    toType: "image/jpeg",
    quality,
  });
  return Array.isArray(r) ? r[0]! : r;
}

export function urlLooksHeic(href: string | null | undefined): boolean {
  if (!href) return false;
  return /\.(hei[cf])(\?|#|$)/i.test(href);
}

export async function heicUrlToJpegObjectUrl(
  publicUrl: string,
  quality = 0.9,
): Promise<string> {
  const res = await fetch(publicUrl, { mode: "cors" });
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const { default: convert } = await import("heic2any");
  const r = await convert({
    blob,
    toType: "image/jpeg",
    quality,
  });
  const out = Array.isArray(r) ? r[0]! : r;
  return URL.createObjectURL(out);
}
