import { getSlotDate, getWeekEndExclusive } from "@/lib/week";
import type { PostStatus, SchedulerCell } from "@/types/scheduler";

export type ApplyCell = {
  bikeId: string;
  status: PostStatus;
  scheduledAt: string;
} | null;

export function weekRange(monday: Date): { from: string; to: string } {
  return {
    from: monday.toISOString(),
    to: getWeekEndExclusive(monday).toISOString(),
  };
}

export function buildApplyFlat(
  weekStart: Date,
  g: (SchedulerCell | null)[][],
): ApplyCell[] {
  const out: ApplyCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 4; s++) {
      const c = g[d]![s];
      if (!c) {
        out.push(null);
        continue;
      }
      out.push({
        bikeId: c.bikeId,
        status: c.status,
        scheduledAt: getSlotDate(weekStart, d, s).toISOString(),
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

type BikeForGen = { id: string; title: string | null; price: string | null; location: string | null };

/**
 * Fills up to 28 slots: unique bike per day, round-robin through the list.
 */
export function buildGenerateApplyFlat(weekStart: Date, bikes: BikeForGen[]): ApplyCell[] {
  const usedBikePerDay: Set<string>[] = Array.from(
    { length: 7 },
    () => new Set(),
  );
  const flat: ApplyCell[] = new Array(28).fill(null);
  if (bikes.length === 0) return flat;
  let cursor = 0;
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 4; s++) {
      for (let tries = 0; tries < bikes.length; tries++) {
        const b = bikes[cursor % bikes.length]!;
        cursor++;
        if (usedBikePerDay[d]!.has(b.id)) continue;
        usedBikePerDay[d]!.add(b.id);
        flat[d * 4 + s] = {
          bikeId: b.id,
          status: "scheduled",
          scheduledAt: getSlotDate(weekStart, d, s).toISOString(),
        };
        break;
      }
    }
  }
  return flat;
}
