export type Bike = {
  id: string;
  sku: string;
  title: string | null;
  price: string | null;
  location: string | null;
  description: string | null;
  year: number | null;
  model: string | null;
  mileage: number | null;
  status: string;
  last_posted_at: string | null;
  post_count: number;
  created_at: string;
};

export type BikeMedia = {
  id: string;
  file_url: string;
  type: "image" | "video";
};
