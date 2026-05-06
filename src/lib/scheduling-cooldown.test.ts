import { describe, expect, it } from "vitest";
import {
  hasPairwiseConflictInBatch,
  inCooldown,
  scheduledTimeMs,
} from "@/lib/scheduling-cooldown";

describe("inCooldown", () => {
  it("respects symmetric window within 14-day default ms", () => {
    const t0 = Date.UTC(2026, 0, 1, 12);
    expect(inCooldown(t0, t0 + 86_400_000 * 13, 86_400_000 * 14)).toBe(true);
    expect(inCooldown(t0, t0 + 86_400_000 * 15, 86_400_000 * 14)).toBe(false);
  });

  it("scheduledTimeMs returns 0 on invalid iso", () => {
    expect(scheduledTimeMs("not-a-date")).toBe(0);
  });
});

describe("hasPairwiseConflictInBatch", () => {
  const t = Date.UTC(2026, 2, 1, 15);
  it("detects duplicate bike too close together", () => {
    expect(
      hasPairwiseConflictInBatch([
        { bikeId: "a", t },
        { bikeId: "a", t: t + 86_400_000 },
      ]),
    ).toBe(true);
  });

  it("allows different bikes on same timestamps", () => {
    expect(
      hasPairwiseConflictInBatch([
        { bikeId: "a", t },
        { bikeId: "b", t },
      ]),
    ).toBe(false);
  });
});
