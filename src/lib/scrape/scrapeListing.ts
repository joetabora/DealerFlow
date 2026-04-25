import * as cheerio from "cheerio";
import { extractMergedForUrl } from "./extractFields";
import { fetchHtmlForScrape } from "./fetchHtml";
import { deriveSkuFromUrl } from "./skuFromUrl";
import type { ScrapeResult, ScrapedListing } from "./types";
import { assertUrlSafeForScraping } from "./urlGuard";

export async function scrapeListingUrl(rawUrl: string): Promise<ScrapeResult> {
  let url: URL;
  try {
    url = assertUrlSafeForScraping(rawUrl.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid URL";
    return { ok: false, url: rawUrl, error: msg };
  }

  const href = url.toString();

  const fetched = await fetchHtmlForScrape(href);
  if (!fetched.ok) {
    return { ok: false, url: fetched.url, error: fetched.error };
  }

  return parseListingFromHtmlString(url, fetched.html);
}

function loadCheerio(
  html: string,
): { ok: true; $: ReturnType<typeof cheerio.load> } | { ok: false; error: string } {
  try {
    return { ok: true, $: cheerio.load(html) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to parse HTML";
    return { ok: false, error: msg };
  }
}

/** Shared extraction after HTML is available (fetched or pasted). */
export function parseListingFromHtmlString(
  url: URL,
  html: string,
): ScrapeResult {
  const href = url.toString();
  const loaded = loadCheerio(html);
  if (!loaded.ok) {
    return { ok: false, url: href, error: loaded.error };
  }
  const $ = loaded.$;

  const partial = extractMergedForUrl($, url);

  const data: ScrapedListing = {
    sku: deriveSkuFromUrl(url, partial.sku),
    title: partial.title,
    price: partial.price,
    location: partial.location,
    description: partial.description,
  };

  if (!data.title && !data.description) {
    return {
      ok: false,
      url: href,
      error:
        "No title or description found. Pasted HTML may be a Cloudflare challenge, or the real listing content is only injected by JavaScript. Open the live listing, wait for it to load, then in DevTools: right‑click the main content → Save as, or use Elements to copy the outer HTML of the VDP (not “View page source” if the page is a JS app).",
    };
  }

  return { ok: true, url: href, data };
}

/**
 * For Cloudflare-protected sites: pass HTML you copied or saved from a real browser session.
 */
export function parseListingFromPastedPage(
  rawUrl: string,
  html: string,
): ScrapeResult {
  let url: URL;
  try {
    url = assertUrlSafeForScraping(rawUrl.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid URL";
    return { ok: false, url: rawUrl, error: msg };
  }
  if (!html.trim()) {
    return { ok: false, url: rawUrl, error: "HTML is empty" };
  }
  return parseListingFromHtmlString(url, html);
}

/** Scrape many URLs with a small concurrency cap */
export async function scrapeListingUrls(
  urls: string[],
  concurrency = 3,
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  let i = 0;

  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      const u = urls[idx]!;
      results[idx] = await scrapeListingUrl(u);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
