import { describe, expect, it } from "vitest";
import type { SchedulerCell } from "@/types/scheduler";
import type { BikeForGen } from "@/lib/schedule-apply";
import {
  buildGenerateApplyFlat,
  hasDuplicateBikesOnSameDay,
  weekRange,
} from "@/lib/schedule-apply";

function mkBike(
  id: string,
  model_family: string | null,
): BikeForGen & { location: string | null } {
  return {
    id,
    title: id,
    price: "$1",
    location: null,
    model_family,
  };
}

function familiesOnDayFromFlat(
  flat: ({ bikeId: string } | null)[],
  byId: Map<string, string | null>,
  dayIdx: number,
): string[] {
  const slice = flat.slice(dayIdx * 4, dayIdx * 4 + 4).filter(Boolean) as {
    bikeId: string;
  }[];
  const out: string[] = [];
  for (const c of slice) {
    const fam = byId.get(c.bikeId) ?? null;
    if (fam?.trim()) out.push(fam.trim().toLowerCase());
  }
  return out;
}

function duplicateFamilyOnDay(slice: string[]): boolean {
  const s = new Set<string>();
  for (const x of slice) {
    if (s.has(x)) return true;
    s.add(x);
  }
  return false;
}

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

describe("buildGenerateApplyFlat diversification", () => {
  const monday = new Date(Date.UTC(2026, 3, 6, 12, 0, 0));

  it("does not assign two bikes with same model_family to one calendar day", () => {
    const bikes = [
      mkBike("b1", "Z Series"),
      mkBike("b2", "Z Series"),
      mkBike("b3", "Y"),
      mkBike("b4", "Y"),
    ];
    const byId = new Map(bikes.map((b) => [b.id, b.model_family]));

    const flat = buildGenerateApplyFlat(monday, bikes, undefined, [], "all");
    for (let d = 0; d < 7; d++) {
      const slice = familiesOnDayFromFlat(flat, byId, d);
      expect(duplicateFamilyOnDay(slice)).toBe(false);
    }
    expect(flat.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("fills first-day slots when families are sparse", () => {
    const bikes = [
      mkBike("u1", "A"),
      mkBike("u2", "B"),
      mkBike("u3", "C"),
      mkBike("u4", null),
    ];
    const flat = buildGenerateApplyFlat(monday, bikes, undefined, [], "all");
    expect(flat.slice(0, 4).filter(Boolean)).toHaveLength(4);
  });
});
