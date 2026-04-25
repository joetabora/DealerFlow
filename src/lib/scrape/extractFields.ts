import type { CheerioAPI } from "cheerio";
import { extractJsonLdFields } from "./jsonLd";
import { getScraperConfig } from "./registry";
import type { DomainScraperConfig, SelectorConfig, ScrapedListing } from "./types";

function pick($: CheerioAPI, field: SelectorConfig): string | null {
  const el = $(field.selector).first();
  if (!el.length) return null;

  const mode = field.mode ?? "text";
  if (mode === "text") {
    const t = el.text().replace(/\s+/g, " ").trim();
    return t || null;
  }
  if (mode === "html") {
    const h = el.html()?.replace(/\s+/g, " ").trim();
    return h || null;
  }
  const v = el.attr(mode.attr)?.trim();
  return v || null;
}

export function extractWithConfig(
  $: CheerioAPI,
  config: DomainScraperConfig,
): Omit<ScrapedListing, "sku"> & { sku: string | null } {
  return {
    sku: config.sku ? pick($, config.sku) : null,
    title: pick($, config.title),
    price: pick($, config.price),
    description: pick($, config.description),
    location: config.location ? pick($, config.location) : null,
  };
}

/** Fallback when no domain config: Open Graph + common meta */
export function extractOpenGraphFallback(
  $: CheerioAPI,
): Omit<ScrapedListing, "sku"> & { sku: string | null } {
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim() ||
    null;

  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  const itempropPrice =
    $("[itemprop=price][content]").attr("content")?.trim() ||
    $("[itemprop=price]").first().text().replace(/\s+/g, " ").trim() ||
    null;

  const price =
    itempropPrice ||
    $('meta[property="product:price:amount"]').attr("content")?.trim() ||
    $('meta[itemprop="price"]').attr("content")?.trim() ||
    null;

  return {
    sku: null,
    title: title || null,
    price: price || null,
    location: null,
    description: description || null,
  };
}

function firstString(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const t = c.toString().replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  return null;
}

/** data-* and common class patterns for dealer / marketplace listing HTML */
function extractHeuristicPrice($: CheerioAPI): string | null {
  const attrKeys = [
    "data-price",
    "data-vehicle-price",
    "data-currency-amount",
    "data-amount",
    "data-sticker",
  ] as const;
  for (const key of attrKeys) {
    const a = $(`[${key}]`).first().attr(key);
    if (a && /\d/.test(a)) {
      return a.replace(/\s+/g, " ").trim();
    }
  }
  const nodes = $(
    "[class*='price'], [class*='Price'], [id*='Price']",
  ).toArray();
  for (const el of nodes.slice(0, 40)) {
    const text = $(el).text();
    const m = text.match(/\$\s*[\d,]+(?:\.\d{2})?/);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

function extractHeuristicLocation($: CheerioAPI): string | null {
  const ip = $(
    "[itemprop=address] [itemprop=addressLocality], [itemprop=addressLocality]",
  )
    .first();
  if (ip.length) {
    const city = ip.first().text().replace(/\s+/g, " ").trim();
    const state = $("[itemprop=addressRegion]").first().text().trim();
    if (city) return state ? `${city}, ${state}` : city;
  }
  const addr = $("address").first().text().replace(/\s+/g, " ").trim();
  if (addr && addr.length < 200) return addr;
  const d = $(
    "[class*='dealer'][class*='name'], [class*='Dealer'], .dealer-name, .dealerName",
  )
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (d) return d;
  return null;
}

/**
 * Merge CSS selectors (registry), JSON-LD (schema.org), and Open Graph / meta
 * in that order of precedence per field, so bad placeholder selectors do not
 * block real data in ld+json/og: tags.
 */
export function extractMergedForUrl(
  $: CheerioAPI,
  url: { hostname: string },
): Omit<ScrapedListing, "sku"> & { sku: string | null } {
  const config = getScraperConfig(url.hostname);
  const fromCss = config
    ? extractWithConfig($, config)
    : {
        sku: null as string | null,
        title: null as string | null,
        price: null as string | null,
        location: null as string | null,
        description: null as string | null,
      };
  const fromLd = extractJsonLdFields($);
  const fromOg = extractOpenGraphFallback($);
  const heurPrice = extractHeuristicPrice($);
  const heurLoc = extractHeuristicLocation($);

  return {
    sku: firstString(fromCss.sku, fromLd.sku) ?? null,
    title: firstString(fromCss.title, fromLd.title, fromOg.title),
    price: firstString(
      fromCss.price,
      fromLd.price,
      fromOg.price,
      heurPrice,
    ),
    location: firstString(
      fromCss.location,
      fromLd.location,
      fromOg.location,
      heurLoc,
    ),
    description: firstString(
      fromCss.description,
      fromLd.description,
      fromOg.description,
    ),
  };
}
