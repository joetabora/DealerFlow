import {
  DEFAULT_SLOT_HOURS,
  rotateLeft,
} from "@/lib/week";

export { DEFAULT_SLOT_HOURS };

export function engagementScore(likes: number, comments: number): number {
  return likes + comments * 2;
}

function nearestTargetHour(
  hour: number,
  targets: readonly number[],
): number {
  return targets.reduce((best, t) =>
    Math.abs(t - hour) < Math.abs(best - hour) ? t : best,
  );
}

function hourInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value;
  return h ? Math.min(23, Math.max(0, parseInt(h, 10))) : 0;
}

export type PostSample = {
  effectiveAt: string;
  likes: number;
  comments: number;
};

/**
 * Sums engagement into buckets for the four canonical slot hours
 * (mapping other local hours to the nearest 9, 12, 15, 19).
 */
export function aggregateByCanonicalHour(
  rows: PostSample[],
  timeZone: string,
): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of DEFAULT_SLOT_HOURS) m.set(t, 0);
  for (const row of rows) {
    const d = new Date(row.effectiveAt);
    if (Number.isNaN(d.getTime())) continue;
    const h = hourInTimeZone(d, timeZone);
    const bucket = nearestTargetHour(h, DEFAULT_SLOT_HOURS);
    const s = m.get(bucket) ?? 0;
    m.set(
      bucket,
      s + engagementScore(row.likes, row.comments),
    );
  }
  return m;
}

/**
 * Order the four default hours from best- to worst-scoring, stable tiebreak by hour.
 */
export function rankHoursByEngagement(
  hourToScore: Map<number, number>,
): number[] {
  return [...DEFAULT_SLOT_HOURS].sort((a, b) => {
    const sa = hourToScore.get(a) ?? 0;
    const sb = hourToScore.get(b) ?? 0;
    if (sb !== sa) return sb - sa;
    return a - b;
  });
}

const MIN_POSTS_FOR_SMART = 2;

/**
 * 7×4 local hours per slot for the week. Same times every day (phase 1) until
 * enough posted history exists, then prefer engagement and rotate by day (phase 3).
 */
export function buildSmartHoursByDay(
  hourToScore: Map<number, number>,
  postCount: number,
): number[][] {
  const hasSmartData = postCount >= MIN_POSTS_FOR_SMART;
  const ranked = hasSmartData
    ? rankHoursByEngagement(hourToScore)
    : [...DEFAULT_SLOT_HOURS];

  const byDay: number[][] = [];
  for (let d = 0; d < 7; d++) {
    byDay.push(
      hasSmartData
        ? rotateLeft(ranked, d % 4)
        : [...DEFAULT_SLOT_HOURS],
    );
  }
  return byDay;
}

export function defaultHoursByDay(): number[][] {
  return Array.from({ length: 7 }, () => [...DEFAULT_SLOT_HOURS]);
}

export function getDealerTimeZone(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEALER_TZ) {
    return process.env.NEXT_PUBLIC_DEALER_TZ;
  }
  return "America/Chicago";
}
