import { createClient } from "@/lib/supabase/server";

export type RecentPostRow = {
  id: string;
  scheduledDate: string;
  status: string;
  bikeTitle: string;
};

export type DashboardStats = {
  totalInventory: number;
  availableBikes: number;
  scheduledToday: number;
  missingMedia: number;
  recentPosts: RecentPostRow[];
  error: string | null;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getDashboardData(): Promise<DashboardStats> {
  const defaults: DashboardStats = {
    totalInventory: 0,
    availableBikes: 0,
    scheduledToday: 0,
    missingMedia: 0,
    recentPosts: [],
    error: null,
  };

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      ...defaults,
      error: "config",
    };
  }

  const { count: totalInventory, error: e1 } = await supabase
    .from("bikes")
    .select("id", { count: "exact", head: true });
  if (e1) {
    return { ...defaults, error: e1.message };
  }

  const { count: availableBikes, error: e2 } = await supabase
    .from("bikes")
    .select("id", { count: "exact", head: true })
    .eq("status", "available");
  if (e2) {
    return { ...defaults, error: e2.message };
  }

  const today = new Date();
  const { count: scheduledToday, error: e3 } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_date", startOfLocalDay(today).toISOString())
    .lte("scheduled_date", endOfLocalDay(today).toISOString())
    .in("status", ["draft", "scheduled"]);
  if (e3) {
    return { ...defaults, error: e3.message };
  }

  const { data: availableRows, error: e4 } = await supabase
    .from("bikes")
    .select("id")
    .eq("status", "available");
  if (e4) {
    return { ...defaults, error: e4.message };
  }

  const availableIds = (availableRows as { id: string }[] | null)?.map(
    (r) => r.id,
  ) ?? [];

  let missingMedia = 0;
  if (availableIds.length > 0) {
    const { data: mediaRows, error: e5 } = await supabase
      .from("media")
      .select("bike_id")
      .in("bike_id", availableIds);
    if (e5) {
      return { ...defaults, error: e5.message };
    }
    const withMedia = new Set(
      (mediaRows as { bike_id: string }[] | null)?.map((m) => m.bike_id) ?? [],
    );
    missingMedia = availableIds.filter((id) => !withMedia.has(id)).length;
  } else {
    missingMedia = 0;
  }

  const { data: postRows, error: e6 } = await supabase
    .from("posts")
    .select("id, scheduled_date, status, bikes ( title )")
    .order("scheduled_date", { ascending: false })
    .limit(5);
  if (e6) {
    return { ...defaults, error: e6.message };
  }

  const recentPosts: RecentPostRow[] = (postRows as unknown as {
    id: string;
    scheduled_date: string;
    status: string;
    bikes: { title: string | null } | null;
  }[] | null)?.map((p) => ({
    id: p.id,
    scheduledDate: p.scheduled_date,
    status: p.status,
    bikeTitle: p.bikes?.title?.trim() || "Untitled bike",
  })) ?? [];

  return {
    totalInventory: totalInventory ?? 0,
    availableBikes: availableBikes ?? 0,
    scheduledToday: scheduledToday ?? 0,
    missingMedia,
    recentPosts,
    error: null,
  };
}
