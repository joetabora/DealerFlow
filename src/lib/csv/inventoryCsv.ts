import { parse } from "csv-parse/sync";
import type { CsvProfileId } from "@/lib/csv/profiles";
import { csvProfileAliases } from "@/lib/csv/profiles";

export type { CsvProfileId } from "@/lib/csv/profiles";

export type ParsedInventoryRow = {
  stock: string;
  model: string;
  year: number | null;
  priceText: string;
  mileage: number | null;
  location: string | null;
  status: "available" | "sold";
  title: string;
  modelFamily: string | null;
  productCategory: string | null;
};

function getCell(row: Record<string, string | undefined>, ...keys: string[]) {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()];
    if (v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseMoneyToDisplay(raw: string): string {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return raw.trim();
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function statusFromRow(raw: string | undefined): "available" | "sold" {
  const s = (raw || "available").toLowerCase().trim();
  if (s === "sold" || s === "s") return "sold";
  return "available";
}

/**
 * Dealer exports (Room 58 / M-BWS and similar): Stock Number, Model, Year, Price, Mileage,
 * optional Family / Vehicle Type columns when using `mbws` profile aliases.
 */
export function parseInventoryCsvString(
  csvText: string,
  profile: CsvProfileId = "default",
): ParsedInventoryRow[] {
  const H = csvProfileAliases(profile);
  const text = csvText.replace(/^\uFEFF/, "");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const out: ParsedInventoryRow[] = [];
  for (const row of records) {
    const stock = getCell(row, ...H.stock);
    if (!stock) continue;

    const model = getCell(row, ...H.model);
    const yRaw = getCell(row, ...H.year);
    const year = yRaw ? parseInt(yRaw, 10) : null;
    const yearVal = year !== null && !Number.isNaN(year) ? year : null;

    const pr = getCell(row, ...H.price);
    const priceText = pr ? parseMoneyToDisplay(pr) : "—";

    const mileRaw = getCell(row, ...H.mileage);
    let mileage: number | null = null;
    if (mileRaw) {
      const m = parseInt(mileRaw.replace(/,/g, ""), 10);
      if (!Number.isNaN(m)) mileage = m;
    }

    const loc = getCell(row, ...H.location) || null;
    const st = getCell(row, ...H.status);

    const mf = getCell(row, ...H.modelFamily) || null;
    const cat = getCell(row, ...H.productCategory) || null;

    const titleParts = [yearVal, model].filter(Boolean) as (string | number)[];
    const title =
      titleParts.length > 0
        ? titleParts
            .map((x) => String(x).trim())
            .join(" ")
            .replace(/\s+/g, " ")
        : getCell(row, ...H.titleHint) || stock;

    out.push({
      stock,
      model,
      year: yearVal,
      priceText,
      mileage,
      location: loc,
      status: statusFromRow(st),
      title: title || stock,
      modelFamily: mf,
      productCategory: cat,
    });
  }
  return out;
}

export const MAX_CSV_BIKES = 2000;
