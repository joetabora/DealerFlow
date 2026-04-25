import type { DomainScraperConfig } from "./types";

/**
 * Per-hostname cheerio selector maps. Add your dealer inventory domains here.
 * Keys must be lowercase hostnames (no port).
 */
// Keys must match URL.hostname (no protocol, no path). List both www and apex if needed.
const milwaukeeHarley: DomainScraperConfig = {
  sku: { selector: "[data-vin]", mode: { attr: "data-vin" } },
  title: { selector: "h1.vehicle-title" },
  price: { selector: ".price-value" },
  description: { selector: ".vehicle-description" },
  location: { selector: ".dealer-name" },
};

export const SCRAPER_REGISTRY: Record<string, DomainScraperConfig> = {
  "milwaukeeharley.com": milwaukeeHarley,
  "www.milwaukeeharley.com": milwaukeeHarley,
};

export function getScraperConfig(hostname: string): DomainScraperConfig | null {
  const key = hostname.toLowerCase();
  return SCRAPER_REGISTRY[key] ?? null;
}
