"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CsvImportResult } from "@/lib/ingest/inventory-csv-sync";
import { syncInventoryFromCsvText } from "@/lib/ingest/inventory-csv-sync";
import { normalizeCsvProfileId, type CsvProfileId } from "@/lib/csv/profiles";

export type { CsvImportResult } from "@/lib/ingest/inventory-csv-sync";

export async function importInventoryCsv(
  formData: FormData,
): Promise<CsvImportResult> {
  const file = formData.get("csv");
  const profileRaw = formData.get("profile");
  const profile = normalizeCsvProfileId(profileRaw);

  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose a CSV file." };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { ok: false, error: "CSV is too large (max 3 MB)." };
  }
  const text = await file.text();
  return importInventoryFromText(text, { profile });
}

export async function importInventoryFromText(
  text: string,
  opts?: { profile?: CsvProfileId },
): Promise<CsvImportResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const profile = normalizeCsvProfileId(opts?.profile);

  const r = await syncInventoryFromCsvText(supabase, text, {
    source: "manual",
    profile,
  });
  if (r.ok) {
    revalidatePath("/inventory");
    revalidatePath("/import/csv");
  }
  return r;
}

export type CsvImportRunRow = {
  id: string;
  created_at: string;
  source: string;
  profile: string | null;
  ok: boolean;
  imported: number | null;
  marked_sold: number | null;
  row_count_available: number | null;
  error_message: string | null;
};

export async function listRecentCsvImportRuns(limit = 12): Promise<
  | { ok: true; rows: CsvImportRunRow[] }
  | { ok: false; error: string }
> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase
    .from("csv_import_runs")
    .select(
      "id, created_at, source, profile, ok, imported, marked_sold, row_count_available, error_message",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(40, Math.max(1, limit)));

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as CsvImportRunRow[] };
}
