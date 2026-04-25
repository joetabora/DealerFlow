import { parse } from "csv-parse/sync";

export type ParsedInventoryRow = {
  stock: string;
  model: string;
  year: number | null;
  priceText: string;
  mileage: number | null;
  location: string | null;
  status: "available" | "sold";
  title: string;
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
 * mBWS / Room 58 style export and similar: Stock Number, Model, Year, Price, Mileage, etc.
 */
export function parseInventoryCsvString(csvText: string): ParsedInventoryRow[] {
  const text = csvText.replace(/^\uFEFF/, "");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const out: ParsedInventoryRow[] = [];
  for (const row of records) {
    const stock = getCell(
      row,
      "Stock Number",
      "Stock number",
      "StockNumber",
      "stock_number",
    );
    if (!stock) continue;

    const model = getCell(row, "Model", "model");
    const yRaw = getCell(row, "Year", "year");
    const year = yRaw ? parseInt(yRaw, 10) : null;
    const yearVal = year !== null && !Number.isNaN(year) ? year : null;

    const pr = getCell(row, "Price", "price", "Sale Price", "Sale price");
    const priceText = pr ? parseMoneyToDisplay(pr) : "—";

    const mileRaw = getCell(row, "Mileage", "mileage");
    let mileage: number | null = null;
    if (mileRaw) {
      const m = parseInt(mileRaw.replace(/,/g, ""), 10);
      if (!Number.isNaN(m)) mileage = m;
    }

    const loc = getCell(row, "Location", "location") || null;
    const st = getCell(row, "Status", "status");

    const titleParts = [yearVal, model].filter(Boolean) as (string | number)[];
    const title =
      titleParts.length > 0
        ? titleParts
            .map((x) => String(x).trim())
            .join(" ")
            .replace(/\s+/g, " ")
        : (getCell(row, "Title", "title") || stock);

    out.push({
      stock,
      model,
      year: yearVal,
      priceText,
      mileage,
      location: loc,
      status: statusFromRow(st),
      title: title || stock,
    });
  }
  return out;
}

export const MAX_CSV_BIKES = 2000;
