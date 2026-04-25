export type PostStatus = "draft" | "scheduled" | "posted";

export type SchedulerCell = {
  postId: string;
  bikeId: string;
  title: string;
  price: string;
  location: string | null;
  thumbUrl: string | null;
  status: PostStatus;
};

export type LocationFilter = "all" | "milwaukee" | "west-bend";
export type StatusFilter = "all" | "draft" | "scheduled" | "posted";
