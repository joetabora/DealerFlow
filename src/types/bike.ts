export type Bike = {
  id: string;
  sku: string;
  title: string | null;
  price: string | null;
  location: string | null;
  description: string | null;
  /** Model lineage for scheduler diversification (CSV / manual). */
  model_family: string | null;
  /** e.g. sport, cruiser — optional bucket from export. */
  product_category: string | null;
  year: number | null;
  model: string | null;
  mileage: number | null;
  status: string;
  last_posted_at: string | null;
  post_count: number;
  created_at: string;
};

export type MediaProcessingStatus = "ready" | "processing" | "failed";

export type BikeMedia = {
  id: string;
  file_url: string;
  type: "image" | "video";
  status?: MediaProcessingStatus;
  original_url?: string | null;
  compressed_url?: string | null;
  processing_error?: string | null;
};
