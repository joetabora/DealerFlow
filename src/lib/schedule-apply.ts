import { renderDefaultCaption } from "@/lib/caption-template";
import { inCooldown, interleaveByDealerLocation, type AnchorPost } from "@/lib/scheduling-cooldown";
import { defaultHoursByDay } from "@/lib/post-timing";
import type { PostStatus, SchedulerCell } from "@/types/scheduler";
import { getSlotDate, getWeekEndExclusive } from "@/lib/week";

export type ApplyCell = {
  bikeId: string;
  status: PostStatus;
  scheduledAt: string;
  caption: string | null;
} | null;

export type BikeForGen = {
  id: string;
  title: string | null;
  price: string | null;
  location: string | null;
  model_family?: string | null;
};

function captionFor(b: BikeForGen | SchedulerCell) {
  const title =
    "title" in b && typeof b.title === "string"
      ? b.title
      : (b as BikeForGen).title?.trim() ?? "Bike";
  const price = ((b as BikeForGen).price ?? (b as SchedulerCell).price) ?? "—";
  const loc = (b as { location: string | null }).location;
  const year = "year" in b ? (b as { year?: number | null }).year : undefined;
  const model = "model" in b ? (b as { model?: string | null }).model : undefined;
  const mileage = "mileage" in b ? (b as { mileage?: number | null }).mileage : undefined;
  return renderDefaultCaption({
    title: title || "Bike",
    price: String(price),
    location: loc,
    year,
    model,
    mileage,
  });
}

function blocked(
  bikeId: string,
  t: number,
  anchorPosts: readonly AnchorPost[],
  local: { bikeId: string; t: number }[],
): boolean {
  for (const a of anchorPosts) {
    if (a.bike_id !== bikeId) continue;
    const te = new Date(a.scheduled_date).getTime();
    if (te > 0 && inCooldown(t, te)) return true;
  }
  for (const p of local) {
    if (p.bikeId !== bikeId) continue;
    if (inCooldown(t, p.t)) return true;
  }
  return false;
}

/** Same model family twice on one calendar column is discouraged when set on bikes. */
function modelFamilyKey(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.toLowerCase();
}

function familyTakenOnDay(
  key: string | null,
  dayIndex: number,
  byDay: Map<number, Set<string>>,
): boolean {
  if (!key) return false;
  return byDay.get(dayIndex)?.has(key) ?? false;
}

function recordFamily(key: string | null, dayIndex: number, byDay: Map<number, Set<string>>) {
  if (!key) return;
  let s = byDay.get(dayIndex);
  if (!s) {
    s = new Set();
    byDay.set(dayIndex, s);
  }
  s.add(key);
}

export function weekRange(monday: Date): { from: string; to: string } {
  return {
    from: monday.toISOString(),
    to: getWeekEndExclusive(monday).toISOString(),
  };
}

export function buildApplyFlat(
  weekStart: Date,
  g: (SchedulerCell | null)[][],
  hoursByDay: number[][] = defaultHoursByDay(),
): ApplyCell[] {
  const out: ApplyCell[] = [];
  for (let d = 0; d < 7; d++) {
    const dayHours = hoursByDay[d] ?? hoursByDay[0] ?? defaultHoursByDay()[0]!;
    for (let s = 0; s < 4; s++) {
      const c = g[d]![s];
      if (!c) {
        out.push(null);
        continue;
      }
      out.push({
        bikeId: c.bikeId,
        status: c.status,
        scheduledAt: getSlotDate(weekStart, d, s, dayHours).toISOString(),
        caption: c.caption?.trim() || captionFor(c),
      });
    }
  }
  return out;
}

export function hasDuplicateBikesOnSameDay(
  g: (SchedulerCell | null)[][],
): boolean {
  for (let d = 0; d < 7; d++) {
    const seen = new Set<string>();
    for (let s = 0; s < 4; s++) {
      const c = g[d]![s];
      if (!c) continue;
      if (seen.has(c.bikeId)) return true;
      seen.add(c.bikeId);
    }
  }
  return false;
}

export function emptyGrid(): (SchedulerCell | null)[][] {
  return Array.from({ length: 7 }, () => [null, null, null, null]);
}

type LocF = "all" | "milwaukee" | "west-bend";

/**
 * Fills up to 28 slots: at most one post per bike per week (14-day spacing vs anchors),
 * Milwaukee / West Bend interleave when `loc` is "all",
 * and at most one post per trimmed `model_family` per calendar day when that field is present.
 */
export function buildGenerateApplyFlat(
  weekStart: Date,
  bikes: BikeForGen[],
  hoursByDay: number[][] = defaultHoursByDay(),
  anchorPosts: readonly AnchorPost[] = [],
  loc: LocF = "all",
): ApplyCell[] {
  const ordered = interleaveByDealerLocation(
    loc === "all"
      ? bikes
      : bikes.filter((b) => {
          const l = (b.location ?? "").toLowerCase();
          if (loc === "milwaukee") return l.includes("milwaukee");
          return l.includes("west") && l.includes("bend");
        }),
    loc,
  );
  const flat: ApplyCell[] = new Array(28).fill(null) as unknown as ApplyCell[];
  if (ordered.length === 0) return flat;
  const used = new Set<string>();
  const localPlaced: { bikeId: string; t: number }[] = [];
  const familiesOnDay = new Map<number, Set<string>>();

  for (let d = 0; d < 7; d++) {
    const dayHours = hoursByDay[d] ?? hoursByDay[0] ?? defaultHoursByDay()[0]!;
    for (let s = 0; s < 4; s++) {
      const start = d * 4 + s;
      const slotT = getSlotDate(weekStart, d, s, dayHours).getTime();

      for (let k = 0; k < ordered.length; k++) {
        const idx = (start * 3 + k) % ordered.length;
        const bike = ordered[idx]!;
        if (used.has(bike.id)) continue;

        const fam = modelFamilyKey(bike.model_family);
        if (familyTakenOnDay(fam, d, familiesOnDay)) continue;

        if (blocked(bike.id, slotT, anchorPosts, localPlaced)) continue;

        localPlaced.push({ bikeId: bike.id, t: slotT });
        used.add(bike.id);
        recordFamily(fam, d, familiesOnDay);

        flat[start] = {
          bikeId: bike.id,
          status: "scheduled",
          scheduledAt: new Date(slotT).toISOString(),
          caption: captionFor(bike),
        };

        break;
      }
    }
  }
  return flat;
}
