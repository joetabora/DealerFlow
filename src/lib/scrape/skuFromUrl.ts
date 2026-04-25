import { createHash } from "crypto";

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

/**
 * Deterministic SKU when the page does not expose one:
 * prefer last meaningful path segment; else host + hash.
 */
export function deriveSkuFromUrl(
  url: URL,
  extractedSku: string | null,
): string {
  if (extractedSku && extractedSku.length > 0) {
    return extractedSku.slice(0, 200);
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && /^[\w-]+$/i.test(last) && last.length <= 120) {
    return `${url.hostname}:${last}`.slice(0, 200);
  }

  return `${url.hostname}:h${shortHash(url.toString())}`.slice(0, 200);
}
