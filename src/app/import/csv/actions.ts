"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_CSV_BIKES,
  parseInventoryCsvString,
} from "@/lib/csv/inventoryCsv";

export type CsvImportResult =
  | { ok: true; imported: number; removed: number }
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

  const supabase = await createClient();
  const skusInCsv = new Set(rows.map((r) => r.stock));

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((r) => ({
      sku: r.stock,
      title: r.title,
      year: r.year,
      model: r.model,
      mileage: r.mileage,
      price: r.priceText,
      location: r.location,
      status: r.status,
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

  const toDelete = allDbSkus.filter((s) => !skusInCsv.has(s));
  for (let i = 0; i < toDelete.length; i += DELETE_CHUNK) {
    const chunk = toDelete.slice(i, i + DELETE_CHUNK);
    const { error: delError } = await supabase
      .from("bikes")
      .delete()
      .in("sku", chunk);
    if (delError) {
      return { ok: false, error: delError.message };
    }
  }

  return { ok: true, imported: rows.length, removed: toDelete.length };
}
