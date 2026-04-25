/**
 * Lightweight SSRF guard: only http(s), block obvious local/private hosts.
 * Does not resolve DNS — hostname string checks only.
 */
export function assertUrlSafeForScraping(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }

  const host = url.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("Local addresses are not allowed");
  }

  if (host.startsWith("10.")) throw new Error("Private network hosts are not allowed");
  if (host.startsWith("192.168.")) throw new Error("Private network hosts are not allowed");
  if (host.startsWith("169.254.")) throw new Error("Link-local hosts are not allowed");

  const m172 = /^172\.(\d+)\./.exec(host);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) {
      throw new Error("Private network hosts are not allowed");
    }
  }

  if (host.includes(":") && !host.includes("::")) {
    // IPv6 literal (rough): block documented private / loopback patterns
    const h = host.replace(/^\[|\]$/g, "");
    if (h === "::1" || h.toLowerCase().startsWith("fc") || h.toLowerCase().startsWith("fd")) {
      throw new Error("Private network hosts are not allowed");
    }
  }

  return url;
}
