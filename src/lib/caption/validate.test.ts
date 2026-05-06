import { describe, expect, it } from "vitest";
import { validateCaptionAgainstConstraints } from "@/lib/caption/validate";

describe("validateCaptionAgainstConstraints", () => {
  it("passes empty rules", () => {
    expect(
      validateCaptionAgainstConstraints("hello world", {}),
    ).toEqual({ ok: true });
  });

  it("enforces hashtags", () => {
    const constraints = { maxHashtagCount: 2 };
    expect(
      validateCaptionAgainstConstraints("a #one #two #three", constraints).ok,
    ).toBe(false);
  });

  it("enforces lengths", () => {
    expect(
      validateCaptionAgainstConstraints("hi", {
        minLength: 50,
      }).ok,
    ).toBe(false);
  });
});
