import { describe, expect, it } from "vitest";
import type { SchedulerCell } from "@/types/scheduler";
import {
  hasDuplicateBikesOnSameDay,
  weekRange,
} from "@/lib/schedule-apply";

function emptyGrid(): (SchedulerCell | null)[][] {
  return Array.from({ length: 7 }, () => [
    null,
    null,
    null,
    null,
  ]) as (SchedulerCell | null)[][];
}

const baseCell = (bikeId: string): SchedulerCell => ({
  postId: "",
  bikeId,
  title: "T",
  price: "—",
  location: null,
  thumbUrl: null,
  status: "scheduled",
  caption: null,
});

describe("weekRange", () => {
  it("returns a forward time window", () => {
    const monday = new Date(Date.UTC(2026, 3, 6, 0, 0, 0));
    const { from, to } = weekRange(monday);
    expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
  });
});

describe("hasDuplicateBikesOnSameDay", () => {
  it("returns false for empty slots", () => {
    expect(hasDuplicateBikesOnSameDay(emptyGrid())).toBe(false);
  });

  it("detects same bike twice on one day column", () => {
    const g = emptyGrid();
    g[0]![0] = baseCell("x");
    g[0]![1] = baseCell("x");
    expect(hasDuplicateBikesOnSameDay(g)).toBe(true);
  });

  it("allows same bike on different columns (days)", () => {
    const g = emptyGrid();
    g[0]![0] = baseCell("x");
    g[1]![0] = baseCell("x");
    expect(hasDuplicateBikesOnSameDay(g)).toBe(false);
  });
});
