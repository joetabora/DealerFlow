/** Context fields that map to caption placeholders. */
export type CaptionContext = {
  title: string;
  price: string;
  location: string | null;
  year?: number | null;
  model?: string | null;
  mileage?: number | null;
  cta?: string | null;
};

/** Optional lint rules applied after placeholders are substituted. */
export type CaptionConstraints = {
  minLength?: number;
  maxLength?: number;
  maxHashtagCount?: number;
};
