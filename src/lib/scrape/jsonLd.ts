import type { CheerioAPI } from "cheerio";

export type JsonLdFields = {
  sku: string | null;
  title: string | null;
  price: string | null;
  location: string | null;
  description: string | null;
};

const EMPTY: JsonLdFields = {
  sku: null,
  title: null,
  price: null,
  location: null,
  description: null,
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function asString(x: unknown): string | null {
  if (x === null || x === undefined) return null;
  if (typeof x === "string" && x.trim()) return x.trim();
  if (typeof x === "number" && !Number.isNaN(x)) return String(x);
  return null;
}

function isProductLikeType(t: unknown): boolean {
  if (typeof t !== "string") return false;
  const s = t.toLowerCase();
  if (s.startsWith("http://schema.org/") || s.startsWith("https://schema.org/")) {
    const last = s.split("/").pop() ?? "";
    return /^(product|vehicle|car|motorcycle|automotive)$/.test(last);
  }
  return /^(Product|ProductGroup|Vehicle|Car|Motorcycle|Automobile)$/.test(
    t,
  );
}

function isDealerishType(t: unknown): boolean {
  if (typeof t !== "string") return false;
  const s = t.toLowerCase();
  if (s.startsWith("http://schema.org/") || s.startsWith("https://schema.org/")) {
    const last = s.split("/").pop() ?? "";
    return /^(autodealer|motorcycledealer|localbusiness|store|organization)$/.test(
      last,
    );
  }
  return /^(AutoDealer|MotorcycleDealer|LocalBusiness|Store|Organization)$/.test(
    t,
  );
}

function formatPostalAddress(a: unknown): string | null {
  if (!isRecord(a)) return null;
  const line1 = asString(a.streetAddress);
  const city = asString(a.addressLocality);
  const region = asString(a.addressRegion);
  const zip = asString(a.postalCode);
  const lineCity = [city, region].filter(Boolean).join(", ");
  const parts = [line1, lineCity, zip].filter(
    (p) => p !== null && p.length > 0,
  ) as string[];
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function extractLocationFromObject(obj: Record<string, unknown>): string | null {
  if (isRecord(obj.address)) {
    const fmt = formatPostalAddress(obj.address);
    if (fmt) return fmt;
  }
  if (isRecord(obj.location)) {
    const loc = obj.location;
    if (isRecord(loc)) {
      if (isRecord(loc.address)) {
        const f = formatPostalAddress(loc.address);
        if (f) return f;
      }
      const n = asString(loc.name);
      if (n) return n;
    }
  }
  return asString(obj.name);
}

type IdMap = Map<string, Record<string, unknown>>;

function indexById(obj: unknown, map: IdMap): void {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((x) => indexById(x, map));
    return;
  }
  if (!isRecord(obj)) return;
  if (typeof obj["@id"] === "string" && !map.has(obj["@id"])) {
    map.set(obj["@id"], obj);
  }
  for (const v of Object.values(obj)) {
    if (v && (typeof v === "object" || Array.isArray(v))) indexById(v, map);
  }
}

/**
 * Recursively collect name/price/sku from schema.org objects (handles @graph, nested offers).
 */
function collectFromObject(
  obj: unknown,
  out: JsonLdFields,
  idMap: IdMap,
): void {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((x) => collectFromObject(x, out, idMap));
    return;
  }
  if (!isRecord(obj)) return;

  const type = obj["@type"];
  const types = Array.isArray(type) ? type : [type];
  const typeStr = (x: unknown) => String(x).toLowerCase();
  const isOffer = types.some(
    (t) => typeStr(t) === "offer" || typeStr(t).endsWith("offer"),
  );
  if (isOffer) {
    if (!out.price) {
      const pr =
        asString(obj.price) ??
        asString(obj.lowPrice) ??
        asString(obj.highPrice);
      if (pr) {
        const cur = asString(obj.priceCurrency);
        out.price = cur && !pr.includes("$") ? `${cur} ${pr}`.trim() : pr;
      }
    }
  }

  const productish = types.some((t) => isProductLikeType(t));

  if (productish) {
    if (!out.title) {
      out.title = asString(obj.name) ?? out.title;
    }
    if (!out.sku) {
      out.sku =
        asString(obj.sku) ?? asString(obj.mpn) ?? asString(obj.productID) ?? out.sku;
    }
    if (!out.sku) {
      out.sku = asString(obj.vehicleIdentificationNumber) ?? out.sku;
    }
    if (!out.description) {
      out.description = asString(obj.description) ?? out.description;
    }
    const off = obj.offers;
    if (off) {
      if (Array.isArray(off)) {
        for (const item of off) {
          if (!out.price) collectFromObject(item, out, idMap);
        }
      } else if (isRecord(off)) {
        if (!out.location) {
          let seller = off.seller;
          if (
            isRecord(seller) &&
            typeof seller["@id"] === "string" &&
            !asString(seller.name)
          ) {
            const r = idMap.get(seller["@id"] as string);
            if (isRecord(r)) seller = r;
          }
          if (isRecord(seller)) {
            out.location =
              extractLocationFromObject(seller) ??
              asString(seller.name) ??
              out.location;
          }
        }
        if (!out.price) {
          const p = off.price ?? off.lowPrice;
          if (p !== undefined) {
            const cur = asString(off.priceCurrency);
            const pr = asString(p) ?? asString(off.lowPrice);
            if (pr) {
              out.price = cur && !pr.includes("$")
                ? `${cur} ${pr}`.trim()
                : pr;
            }
          } else {
            collectFromObject(off, out, idMap);
          }
        }
      }
    }
  }

  if (types.some((t) => isDealerishType(t))) {
    if (!out.location) {
      out.location = extractLocationFromObject(obj) ?? asString(obj.name) ?? out.location;
    }
  }

  if (isRecord(obj.offers) && !out.price) {
    const off = obj.offers;
    if (isRecord(off)) {
      const p =
        asString(off.price) ?? asString(off.lowPrice) ?? asString(off.highPrice);
      if (p) out.price = p;
    }
  }
  if (Array.isArray(obj.offers) && !out.price) {
    for (const o of obj.offers) {
      if (!isRecord(o)) continue;
      const p =
        asString(o.price) ?? asString(o.lowPrice) ?? asString(o.highPrice);
      if (p) {
        out.price = p;
        break;
      }
    }
  }

  for (const v of Object.values(obj)) {
    if (v && (typeof v === "object" || Array.isArray(v)))
      collectFromObject(v, out, idMap);
  }
}

/** Pull listing fields from <script type="application/ld+json"> blocks. */
export function extractJsonLdFields($: CheerioAPI): JsonLdFields {
  const out: JsonLdFields = { ...EMPTY };
  const idMap: IdMap = new Map();
  const chunks: unknown[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return;
    }
    indexById(data, idMap);
    chunks.push(data);
  });
  for (const data of chunks) {
    collectFromObject(data, out, idMap);
  }
  return out;
}
