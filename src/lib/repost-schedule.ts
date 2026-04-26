import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SLOT_HOURS } from "@/lib/week";

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Next local slot in the future, avoiding one draft/scheduled post per bike per UTC day
 * (matches DB unique index on UTC calendar day for active posts).
 */
export async function findNextOpenSlot(
  supabase: SupabaseClient,
  bikeId: string,
): Promise<Date> {
  const { data: blockers, error } = await supabase
    .from("posts")
    .select("scheduled_date")
    .eq("bike_id", bikeId)
    .in("status", ["draft", "scheduled"]);
  if (error) {
    const f = new Date();
    f.setDate(f.getDate() + 1);
    f.setHours(9, 0, 0, 0);
    return f;
  }
  const blockedUtcDays = new Set(
    (blockers ?? []).map((p) => utcDateKey(new Date(p.scheduled_date as string))),
  );
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 56; dayOffset++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + dayOffset);
    dayStart.setHours(0, 0, 0, 0);
    for (const h of DEFAULT_SLOT_HOURS) {
      const slot = new Date(dayStart);
      slot.setHours(h, 0, 0, 0);
      if (slot <= now) continue;
      if (blockedUtcDays.has(utcDateKey(slot))) continue;
      return slot;
    }
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 57);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}
