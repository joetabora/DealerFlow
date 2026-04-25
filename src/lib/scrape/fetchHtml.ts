import { assertUrlSafeForScraping } from "./urlGuard";

const FETCH_TIMEOUT_MS = 25_000;

/** Realistic browser headers. Many inventory sites (Akamai, Cloudflare, etc.) 403 non-browser fetches. */
function browserLikeHeaders(targetUrl: URL): Headers {
  const origin = targetUrl.origin;
  const h = new Headers();
  h.set(
    "User-Agent",
    process.env.SCRAPER_USER_AGENT?.trim() ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );
  h.set(
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  );
  h.set("Accept-Language", "en-US,en;q=0.9");
  h.set("Cache-Control", "max-age=0");
  h.set("Upgrade-Insecure-Requests", "1");
  h.set("Sec-Fetch-Dest", "document");
  h.set("Sec-Fetch-Mode", "navigate");
  h.set("Sec-Fetch-Site", "none");
  h.set("Sec-Fetch-User", "?1");
  h.set("Sec-Ch-Ua", '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"');
  h.set("Sec-Ch-Ua-Mobile", "?0");
  h.set("Sec-Ch-Ua-Platform", '"Windows"');
  // Looks like a click from the dealer home page, not a cold bot
  h.set("Referer", `${origin}/`);
  return h;
}

export type FetchHtmlResult =
  | { ok: true; url: string; html: string }
  | { ok: false; url: string; error: string };

export function fetchHtmlForScrape(rawUrl: string): Promise<FetchHtmlResult> {
  let target: URL;
  try {
    target = assertUrlSafeForScraping(rawUrl.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid URL";
    return Promise.resolve({ ok: false, url: rawUrl, error: msg });
  }

  const href = target.toString();
  return (async () => {
    try {
      const res = await fetch(href, {
        headers: browserLikeHeaders(target),
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        const base = `HTTP ${res.status} ${res.statusText}`;
        const extra =
          res.status === 403
            ? " — often Cloudflare or similar. Server fetch cannot run JS challenges. Use “Paste page HTML” on the import page: open the listing in your browser, then View source or Save as HTML and paste it."
            : "";
        return { ok: false, url: href, error: base + extra };
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
        return {
          ok: false,
          url: href,
          error: `Unexpected content-type: ${ct || "unknown"}`,
        };
      }

      const html = await res.text();
      return { ok: true, url: href, html };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to fetch listing page";
      return { ok: false, url: href, error: msg };
    }
  })();
}
