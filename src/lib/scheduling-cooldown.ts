import { REPOST_COOLDOWN_DAYS } from "@/lib/engagement";

export const SCHEDULE_COOLDOWN_MS = REPOST_COOLDOWN_DAYS * 86_400_000;

export type AnchorPost = { bike_id: string; scheduled_date: string };

export function scheduledTimeMs(s: string): number {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function inCooldown(
  tA: number,
  tB: number,
  ms: number = SCHEDULE_COOLDOWN_MS,
): boolean {
  return Math.abs(tA - tB) < ms;
}

/**
 * True if a slot at tNew is too close to any anchor time for the same bike.
 */
export function conflictsWithAnchors(
  bikeId: string,
  tNew: number,
  anchors: readonly AnchorPost[],
): boolean {
  for (const a of anchors) {
    if (a.bike_id !== bikeId) continue;
    const te = scheduledTimeMs(a.scheduled_date);
    if (te > 0 && inCooldown(tNew, te)) return true;
  }
  return false;
}

export function hasPairwiseConflictInBatch(
  items: { bikeId: string; t: number }[],
): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i]!.bikeId !== items[j]!.bikeId) continue;
      if (inCooldown(items[i]!.t, items[j]!.t)) return true;
    }
  }
  return false;
}

/**
 * Bikes and locations: split and interleave (Milwaukee / West Bend) for “all” filter.
 */
export function interleaveByDealerLocation<
  T extends { id: string; location: string | null },
>(bikes: T[], locFilter: "all" | "milwaukee" | "west-bend"): T[] {
  if (locFilter !== "all") return [...bikes];
  const mke: T[] = [];
  const wb: T[] = [];
  const other: T[] = [];
  for (const b of bikes) {
    const l = (b.location ?? "").toLowerCase();
    if (l.includes("milwaukee")) mke.push(b);
    else if (l.includes("west") && l.includes("bend")) wb.push(b);
    else other.push(b);
  }
  const out: T[] = [];
  let i = 0;
  let j = 0;
  let useMke = true;
  while (i < mke.length && j < wb.length) {
    if (useMke) {
      out.push(mke[i]!);
      i++;
    } else {
      out.push(wb[j]!);
      j++;
    }
    useMke = !useMke;
  }
  while (i < mke.length) out.push(mke[i++]!);
  while (j < wb.length) out.push(wb[j++]!);
  return [...out, ...other];
}
