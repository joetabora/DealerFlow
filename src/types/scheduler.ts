export type PostStatus = "draft" | "scheduled" | "posted";

export type SchedulerCell = {
  postId: string;
  bikeId: string;
  sku?: string | null;
  title: string;
  price: string;
  location: string | null;
  thumbUrl: string | null;
  status: PostStatus;
  /** Rendered or edited caption; persisted on posts.caption */
  caption: string | null;
  year?: number | null;
  model?: string | null;
  mileage?: number | null;
};

export type LocationFilter = "all" | "milwaukee" | "west-bend";
export type StatusFilter = "all" | "draft" | "scheduled";
