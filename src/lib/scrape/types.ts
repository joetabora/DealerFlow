export type SelectorConfig = {
  /** CSS selector */
  selector: string;
  /** How to read value: text (default), html, or an HTML attribute name */
  mode?: "text" | "html" | { attr: string };
};

export type DomainScraperConfig = {
  /** If omitted, SKU is derived from URL / hash (see scrapeListing) */
  sku?: SelectorConfig;
  title: SelectorConfig;
  price: SelectorConfig;
  description: SelectorConfig;
  location?: SelectorConfig;
};

export type ScrapedListing = {
  sku: string;
  title: string | null;
  price: string | null;
  location: string | null;
  description: string | null;
};

export type ScrapeFailure = {
  ok: false;
  url: string;
  error: string;
};

export type ScrapeSuccess = {
  ok: true;
  url: string;
  data: ScrapedListing;
};

export type ScrapeResult = ScrapeSuccess | ScrapeFailure;
