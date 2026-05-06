/**
 * Saved column aliases for recurring dealer exports (M-BWS / Room 58, etc.).
 * Parser merges these with the default header list per profile.
 */
export type CsvProfileId = "default" | "mbws";

const MBWS_EXTRA = {
  stock: ["Stock Number", "Stock number", "StockNumber", "stock_number", "SKU", "Sku"],
  model: ["Model", "model"],
  year: ["Year", "year"],
  price: ["Price", "price", "Sale Price", "Sale price"],
  mileage: ["Mileage", "mileage"],
  location: ["Location", "location"],
  status: ["Status", "status"],
  titleHint: ["Title", "title", "Vehicle Title"],
  /** Model series / lineup for diversification + display */
  modelFamily: ["Model Family", "model_family", "Series", "series", "Family"],
  /** Cruiser / sport / ATV buckets */
  productCategory: ["Category", "Vehicle Type", "Type", "class", "Body Class"],
} as const;

export function csvProfileAliases(
  profile: CsvProfileId,
): typeof MBWS_EXTRA {
  switch (profile) {
    case "mbws":
      return MBWS_EXTRA;
    default:
      return MBWS_EXTRA;
  }
}

export function normalizeCsvProfileId(raw: unknown): CsvProfileId {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "mbws") return "mbws";
  return "default";
}
