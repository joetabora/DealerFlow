"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseListingFromPastedPage, scrapeListingUrls } from "@/lib/scrape/scrapeListing";

export type ImportRowResult =
  | { url: string; ok: true; sku: string }
  | { url: string; ok: false; error: string };

const inputSchema = z.string().max(512 * 1024);
const urlSchema = z.string().url();
const MAX_URLS = 50;

function parseUrlList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type UrlStep =
  | { original: string; kind: "invalid"; error: string }
  | { original: string; kind: "valid"; normalized: string };

export async function importFromUrls(formText: string): Promise<ImportRowResult[]> {
  const checked = inputSchema.safeParse(formText);
  if (!checked.success) {
    return [
      {
        url: "(input)",
        ok: false,
        error: checked.error.flatten().formErrors.join("; "),
      },
    ];
  }

  const urls = parseUrlList(checked.data).slice(0, MAX_URLS);
  if (urls.length === 0) return [];

  const steps: UrlStep[] = urls.map((original) => {
    const r = urlSchema.safeParse(original);
    if (!r.success) {
      return {
        original,
        kind: "invalid" as const,
        error: r.error.flatten().formErrors.join("; ") || "Invalid URL",
      };
    }
    return {
      original,
      kind: "valid" as const,
      normalized: r.data,
    };
  });

  const toFetch = steps
    .filter((s): s is Extract<UrlStep, { kind: "valid" }> => s.kind === "valid")
    .map((s) => s.normalized);

  const scraped =
    toFetch.length > 0 ? await scrapeListingUrls(toFetch, 3) : [];
  const byUrl = new Map(scraped.map((s) => [s.url, s] as const));

  const supabase = await createClient();
  const out: ImportRowResult[] = [];

  for (const step of steps) {
    if (step.kind === "invalid") {
      out.push({ url: step.original, ok: false, error: step.error });
      continue;
    }

    const row = byUrl.get(step.normalized);
    if (!row) {
      out.push({
        url: step.original,
        ok: false,
        error: "No scrape result (internal)",
      });
      continue;
    }

    if (!row.ok) {
      out.push({ url: step.original, ok: false, error: row.error });
      continue;
    }

    const { data, error } = await supabase.from("bikes").upsert(
      {
        sku: row.data.sku,
        title: row.data.title,
        price: row.data.price,
        location: row.data.location,
        description: row.data.description,
        status: "available",
      },
      { onConflict: "sku" },
    );

    if (error) {
      out.push({
        url: step.original,
        ok: false,
        error: error.message,
      });
      continue;
    }

    void data;
    out.push({ url: step.original, ok: true, sku: row.data.sku });
  }

  return out;
}

const pastedHtmlSchema = z.string().max(2 * 1024 * 1024);
const singleUrlSchema = z.string().url().max(4096);

/**
 * For sites that return 403 to server fetch (e.g. Cloudflare): pass HTML from your browser
 * (View page source, or save the loaded listing page as HTML) plus the same listing URL.
 */
export async function importFromPastedHtml(
  pageUrl: string,
  pageHtml: string,
): Promise<ImportRowResult> {
  const urlParsed = singleUrlSchema.safeParse(pageUrl.trim());
  if (!urlParsed.success) {
    return {
      url: pageUrl,
      ok: false,
      error: urlParsed.error.flatten().formErrors.join("; ") || "Invalid URL",
    };
  }
  const htmlParsed = pastedHtmlSchema.safeParse(pageHtml);
  if (!htmlParsed.success) {
    return { url: pageUrl, ok: false, error: "HTML is too large" };
  }

  const parsed = parseListingFromPastedPage(urlParsed.data, htmlParsed.data);
  if (!parsed.ok) {
    return { url: pageUrl, ok: false, error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("bikes").upsert(
    {
      sku: parsed.data.sku,
      title: parsed.data.title,
      price: parsed.data.price,
      location: parsed.data.location,
      description: parsed.data.description,
      status: "available",
    },
    { onConflict: "sku" },
  );
  if (error) {
    return { url: pageUrl, ok: false, error: error.message };
  }
  void data;
  return { url: pageUrl, ok: true, sku: parsed.data.sku };
}
