/** Four daily slot times (local): 9 AM, 12 PM, 3 PM, 7 PM. */
export const DEFAULT_SLOT_HOURS = [9, 12, 15, 19] as const;

export function rotateLeft<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return arr;
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

/** Monday 00:00:00.000 in the same local timezone as `d`. */
export function getMonday(d: Date): Date {
  const r = new Date(d);
  const n = (r.getDay() + 6) % 7; // Mon = 0
  r.setDate(r.getDate() - n);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getWeekEndExclusive(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setDate(e.getDate() + 7);
  return e;
}

/**
 * Local instant for a slot. `dayHours` should be four local clock hours for that day
 * (defaults to 9 / 12 / 15 / 19).
 */
export function getSlotDate(
  weekStart: Date,
  dayIndex: number,
  slotIndex: number,
  dayHours: readonly number[] = DEFAULT_SLOT_HOURS,
): Date {
  const t = new Date(weekStart);
  t.setDate(t.getDate() + dayIndex);
  const h = dayHours[slotIndex] ?? DEFAULT_SLOT_HOURS[slotIndex] ?? 9;
  t.setHours(h, 0, 0, 0);
  return t;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
