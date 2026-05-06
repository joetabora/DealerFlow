import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_CSV_BIKES,
  parseInventoryCsvString,
  type ParsedInventoryRow,
} from "@/lib/csv/inventoryCsv";
import type { CsvProfileId } from "@/lib/csv/profiles";
import { normalizeCsvProfileId } from "@/lib/csv/profiles";

export type CsvImportResult =
  | { ok: true; imported: number; markedSold: number }
  | { ok: false; error: string };

const CHUNK = 150;
const SELECT_PAGE = 1000;
const DELETE_CHUNK = 200;

async function listAllBikesSkus(supabase: SupabaseClient): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += SELECT_PAGE) {
    const { data, error } = await supabase
      .from("bikes")
      .select("sku")
      .order("sku")
      .range(from, from + SELECT_PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...(data as { sku: string }[]).map((r) => r.sku));
    if (data.length < SELECT_PAGE) break;
  }
  return out;
}

async function logImportRun(
  supabase: SupabaseClient,
  row: {
    source: "manual" | "cron";
    profile: string | null;
    ok: boolean;
    imported: number | null;
    marked_sold: number | null;
    row_count_available: number | null;
    error_message: string | null;
  },
): Promise<void> {
  await supabase.from("csv_import_runs").insert({
    source: row.source,
    profile: row.profile,
    ok: row.ok,
    imported: row.imported,
    marked_sold: row.marked_sold,
    row_count_available: row.row_count_available,
    error_message: row.error_message,
  });
}

function dedupeParsed(rows: ParsedInventoryRow[]): ParsedInventoryRow[] {
  return Array.from(new Map(rows.map((r) => [r.stock, r] as const)).values());
}

export type SyncInventoryCsvOptions = {
  source: "manual" | "cron";
  profile?: CsvProfileId;
};

/**
 * Shared CSV sync: parse, upsert available rows, mark absent SKUs sold, audit log.
 */
export async function syncInventoryFromCsvText(
  supabase: SupabaseClient,
  text: string,
  opts: SyncInventoryCsvOptions,
): Promise<CsvImportResult> {
  const profile = normalizeCsvProfileId(opts.profile);
  let rows: ParsedInventoryRow[];
  try {
    const parsed = parseInventoryCsvString(text, profile);
    rows = dedupeParsed(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to parse CSV";
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: null,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }

  if (rows.length === 0) {
    const msg = "No data rows with a Stock Number were found.";
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: null,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }
  if (rows.length > MAX_CSV_BIKES) {
    const msg = `Too many rows (${rows.length}). Max is ${MAX_CSV_BIKES}.`;
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: null,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }

  const availableRows = rows.filter((r) => r.status === "available");
  if (rows.length > 0 && availableRows.length === 0) {
    const msg =
      "The file has no available (in-stock) rows — every line is sold. Row(s) with status sold are not imported, and the catalog was not changed. Add at least one available row, or this may be a wrong export.";
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: availableRows.length,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }
  if (availableRows.length > MAX_CSV_BIKES) {
    const msg = `Too many in-stock rows (${availableRows.length}). Max is ${MAX_CSV_BIKES}.`;
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: availableRows.length,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }

  const skusInCsv = new Set(availableRows.map((r) => r.stock));

  for (let i = 0; i < availableRows.length; i += CHUNK) {
    const batch = availableRows.slice(i, i + CHUNK).map((r) => ({
      sku: r.stock,
      title: r.title,
      year: r.year,
      model: r.model,
      mileage: r.mileage,
      price: r.priceText,
      location: r.location,
      model_family: r.modelFamily?.trim() || null,
      product_category: r.productCategory?.trim() || null,
      status: "available" as const,
    }));

    const { error } = await supabase.from("bikes").upsert(batch, {
      onConflict: "sku",
    });
    if (error) {
      await logImportRun(supabase, {
        source: opts.source,
        profile,
        ok: false,
        imported: null,
        marked_sold: null,
        row_count_available: availableRows.length,
        error_message: error.message,
      });
      return { ok: false, error: error.message };
    }
  }

  let allDbSkus: string[];
  try {
    allDbSkus = await listAllBikesSkus(supabase);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to list existing bikes";
    await logImportRun(supabase, {
      source: opts.source,
      profile,
      ok: false,
      imported: null,
      marked_sold: null,
      row_count_available: availableRows.length,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }

  const skusNotInCsv = allDbSkus.filter((s) => !skusInCsv.has(s));
  for (let i = 0; i < skusNotInCsv.length; i += DELETE_CHUNK) {
    const chunk = skusNotInCsv.slice(i, i + DELETE_CHUNK);
    const { error: upErr } = await supabase
      .from("bikes")
      .update({ status: "sold" })
      .in("sku", chunk);
    if (upErr) {
      await logImportRun(supabase, {
        source: opts.source,
        profile,
        ok: false,
        imported: null,
        marked_sold: null,
        row_count_available: availableRows.length,
        error_message: upErr.message,
      });
      return { ok: false, error: upErr.message };
    }
  }

  await logImportRun(supabase, {
    source: opts.source,
    profile,
    ok: true,
    imported: availableRows.length,
    marked_sold: skusNotInCsv.length,
    row_count_available: availableRows.length,
    error_message: null,
  });

  return {
    ok: true,
    imported: availableRows.length,
    markedSold: skusNotInCsv.length,
  };
}
