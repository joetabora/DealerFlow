/**
 * WebKit can decode many HEIC/HEIF in &lt;img&gt;; Chromium generally cannot. Prefer native
 * rendering on iOS / iPadOS and desktop Safari so we do not depend on heic2any WASM there.
 */
export function heicDisplaySupportsNativeImage(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return true;
  }
  if (/(Mac OS X|Macintosh)/.test(ua) && /Safari\//.test(ua)) {
    if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return false;
    return true;
  }
  return false;
}
