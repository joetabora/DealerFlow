"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_CSV_BIKES,
  parseInventoryCsvString,
} from "@/lib/csv/inventoryCsv";

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

export async function importInventoryCsv(
  formData: FormData,
): Promise<CsvImportResult> {
  const file = formData.get("csv");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose a CSV file." };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { ok: false, error: "CSV is too large (max 3 MB)." };
  }
  const text = await file.text();
  return importInventoryFromText(text);
}

export async function importInventoryFromText(
  text: string,
): Promise<CsvImportResult> {
  let rows: ReturnType<typeof parseInventoryCsvString>;
  try {
    const parsed = parseInventoryCsvString(text);
    // Last row wins for duplicate stock numbers in the file
    rows = Array.from(
      new Map(parsed.map((r) => [r.stock, r] as const)).values(),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to parse CSV";
    return { ok: false, error: msg };
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows with a Stock Number were found." };
  }
  if (rows.length > MAX_CSV_BIKES) {
    return {
      ok: false,
      error: `Too many rows (${rows.length}). Max is ${MAX_CSV_BIKES}.`,
    };
  }

  const availableRows = rows.filter((r) => r.status === "available");
  if (rows.length > 0 && availableRows.length === 0) {
    return {
      ok: false,
      error:
        "The file has no available (in-stock) rows — every line is sold. Row(s) with status sold are not imported, and the catalog was not changed. Add at least one available row, or this may be a wrong export.",
    };
  }
  if (availableRows.length > MAX_CSV_BIKES) {
    return {
      ok: false,
      error: `Too many in-stock rows (${availableRows.length}). Max is ${MAX_CSV_BIKES}.`,
    };
  }

  const supabase = await createClient();
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
      status: "available" as const,
    }));

    const { error } = await supabase.from("bikes").upsert(batch, {
      onConflict: "sku",
    });
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  let allDbSkus: string[];
  try {
    allDbSkus = await listAllBikesSkus(supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list existing bikes";
    return { ok: false, error: msg };
  }

  const skusNotInCsv = allDbSkus.filter((s) => !skusInCsv.has(s));
  const MARK_CHUNK = DELETE_CHUNK;
  for (let i = 0; i < skusNotInCsv.length; i += MARK_CHUNK) {
    const chunk = skusNotInCsv.slice(i, i + MARK_CHUNK);
    const { error: upErr } = await supabase
      .from("bikes")
      .update({ status: "sold" })
      .in("sku", chunk);
    if (upErr) {
      return { ok: false, error: upErr.message };
    }
  }

  return { ok: true, imported: availableRows.length, markedSold: skusNotInCsv.length };
}
