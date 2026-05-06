import { defaultHoursByDay } from "@/lib/post-timing";
import { weekRange } from "@/lib/schedule-apply";
import { dayLabels, getSlotDate } from "@/lib/week";
import type { SchedulerCell } from "@/types/scheduler";

export type WeekPostingPackageItem = {
  dayLabel: string;
  dayIndex: number;
  slotIndex: number;
  /** Slot start derived from dealer hours grid. */
  scheduled_at: string;
  sku: string | null;
  bike_id: string;
  title: string;
  price: string;
  location: string | null;
  hero_image_url: string | null;
  caption: string;
  status: string;
};

/** JSON manifest for manual posting workflows (captions + hero URLs per slot). */
export function buildWeeklyPostingPackage(
  weekStartMonday: Date,
  hoursByDay: number[][],
  grid: (SchedulerCell | null)[][],
): {
  exported_at: string;
  week_range: ReturnType<typeof weekRange>;
  items: WeekPostingPackageItem[];
} {
  const { from, to } = weekRange(weekStartMonday);
  const hours = hoursByDay.length ? hoursByDay : defaultHoursByDay();
  const items: WeekPostingPackageItem[] = [];
  const now = new Date().toISOString();

  for (let d = 0; d < 7; d++) {
    const dayHours = hours[d] ?? hours[0] ?? defaultHoursByDay()[0]!;
    const labelDate = new Date(weekStartMonday);
    labelDate.setDate(labelDate.getDate() + d);
    const dayHuman = `${dayLabels[d]} ${labelDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    for (let s = 0; s < 4; s++) {
      const cell = grid[d]?.[s] ?? null;
      if (!cell) continue;
      const scheduled = getSlotDate(weekStartMonday, d, s, dayHours);
      items.push({
        dayLabel: dayHuman,
        dayIndex: d,
        slotIndex: s,
        scheduled_at: scheduled.toISOString(),
        sku: cell.sku ?? null,
        bike_id: cell.bikeId,
        title: cell.title,
        price: cell.price,
        location: cell.location,
        hero_image_url: cell.thumbUrl,
        caption: (cell.caption ?? "").trim(),
        status: cell.status,
      });
    }
  }

  return {
    exported_at: now,
    week_range: { from, to },
    items,
  };
}
