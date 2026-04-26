import { isSameLocalDay } from "@/lib/week";
import type { SchedulerCell } from "@/types/scheduler";

type PostIn = {
  id: string;
  bike_id: string;
  scheduled_date: string;
  status: string;
  title: string | null;
  price: string | null;
  location: string | null;
  thumb: string | null;
  caption: string | null;
};

/**
 * Map posts returned from the server into a 7×4 grid (by local day, then by time on that day).
 * Run in the browser so local timezone matches the user.
 */
export function mapPostsToGrid(weekStart: Date, posts: PostIn[]): (SchedulerCell | null)[][] {
  const grid: (SchedulerCell | null)[][] = Array.from({ length: 7 }, () => [
    null,
    null,
    null,
    null,
  ]);
  const byDay: PostIn[][] = Array.from({ length: 7 }, () => []);

  for (const p of posts) {
    const t = new Date(p.scheduled_date);
    for (let d = 0; d < 7; d++) {
      const x = new Date(weekStart);
      x.setDate(x.getDate() + d);
      if (isSameLocalDay(t, x)) {
        byDay[d]!.push(p);
        break;
      }
    }
  }

  for (let d = 0; d < 7; d++) {
    byDay[d]!.sort(
      (a, b) =>
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime(),
    );
    for (let s = 0; s < Math.min(4, byDay[d]!.length); s++) {
      const p = byDay[d]![s]!;
      grid[d]![s] = {
        postId: p.id,
        bikeId: p.bike_id,
        title: p.title?.trim() ?? "Untitled",
        price: p.price ?? "—",
        location: p.location?.trim() ?? null,
        thumbUrl: p.thumb,
        status: p.status as SchedulerCell["status"],
        caption: p.caption,
      };
    }
  }
  return grid;
}

export function flatGrid(
  g: (SchedulerCell | null)[][],
): (SchedulerCell | null)[] {
  const out: (SchedulerCell | null)[] = [];
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 4; s++) {
      out.push(g[d]![s]!);
    }
  }
  return out;
}

export function unflatGrid(
  flat: (SchedulerCell | null)[],
): (SchedulerCell | null)[][] {
  const g: (SchedulerCell | null)[][] = Array.from({ length: 7 }, () => [
    null,
    null,
    null,
    null,
  ]);
  for (let i = 0; i < 28; i++) {
    g[Math.floor(i / 4)]![i % 4] = flat[i] ?? null;
  }
  return g;
}
