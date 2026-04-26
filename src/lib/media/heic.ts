const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

function normalizeHeicLikeBlob(
  blob: Blob,
  publicUrl: string,
  contentTypeHeader: string | null,
): Blob {
  const fromHeader = (contentTypeHeader || "")
    .split(";")[0]
    ?.trim()
    .toLowerCase() ?? "";
  const fromBlob = (blob.type || "").toLowerCase();
  if (
    fromHeader.includes("heic") ||
    fromHeader.includes("heif") ||
    fromBlob.includes("heic") ||
    fromBlob.includes("heif")
  ) {
    return blob;
  }
  if (urlLooksHeic(publicUrl) || /\.hei[cf](\?|#|$)/i.test(publicUrl)) {
    return new Blob([blob], { type: "image/heic" });
  }
  if (fromHeader && !fromHeader.includes("octet") && fromHeader.startsWith("image/")) {
    return blob;
  }
  return new Blob([blob], { type: "image/heic" });
}

/**
 * Fetches a public object URL, then same-origin /api proxy if CORS or status fails
 * (common with cross-origin storage + heic2any).
 */
export async function fetchHeicBlobFromPublicUrl(publicUrl: string): Promise<Blob> {
  let res: Response | null = null;
  try {
    res = await fetch(publicUrl, { mode: "cors", credentials: "omit" });
  } catch {
    res = null;
  }
  if (res?.ok) {
    const body = await res.blob();
    return normalizeHeicLikeBlob(
      body,
      publicUrl,
      res.headers.get("content-type"),
    );
  }

  if (typeof window === "undefined") {
    throw new Error(
      res ? `HEIC load failed: ${res.status}` : "HEIC load failed: network",
    );
  }
  const proxy = new URL("/api/media/heic-source", window.location.origin);
  proxy.searchParams.set("url", publicUrl);
  const res2 = await fetch(proxy.toString(), { credentials: "same-origin" });
  if (!res2.ok) {
    throw new Error(
      `HEIC load failed: ${res ? `${res.status} then ` : ""}proxy ${res2.status}`,
    );
  }
  const body2 = await res2.blob();
  return normalizeHeicLikeBlob(
    body2,
    publicUrl,
    res2.headers.get("content-type"),
  );
}

async function heicLikeBlobToJpegOrPng(
  blob: Blob,
  quality: number,
): Promise<Blob> {
  const { default: convert } = await import("heic2any");
  const attempts: { toType: "image/jpeg" | "image/png"; multiple?: true }[] = [
    { toType: "image/jpeg", multiple: true },
    { toType: "image/png", multiple: true },
    { toType: "image/jpeg" },
    { toType: "image/png" },
  ];
  let last: unknown;
  for (const opts of attempts) {
    try {
      const r = await convert({ blob, quality, ...opts });
      return Array.isArray(r) ? r[0]! : r;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

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
  let blob: Blob = file;
  if (!file.type || file.type === "application/octet-stream") {
    if (isHeicFile(file)) {
      blob = new Blob([file], { type: "image/heic" });
    }
  }
  return heicLikeBlobToJpegOrPng(blob, quality);
}

export function urlLooksHeic(href: string | null | undefined): boolean {
  if (!href) return false;
  return /\.(hei[cf])(\?|#|$)/i.test(href);
}

export async function heicUrlToJpegObjectUrl(
  publicUrl: string,
  quality = 0.9,
): Promise<string> {
  const blob = await fetchHeicBlobFromPublicUrl(publicUrl);
  const out = await heicLikeBlobToJpegOrPng(blob, quality);
  return URL.createObjectURL(out);
}
