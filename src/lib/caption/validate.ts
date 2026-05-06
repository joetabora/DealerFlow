import type { CaptionConstraints } from "@/lib/caption/types";

function hashtagCount(text: string): number {
  return (text.match(/#\w+/g) ?? []).length;
}

export type CaptionValidationResult =
  | { ok: true }
  | { ok: false; issues: string[] };

export function validateCaptionAgainstConstraints(
  text: string,
  constraints: CaptionConstraints | undefined,
): CaptionValidationResult {
  if (!constraints) return { ok: true };
  const issues: string[] = [];
  const t = text.trim();
  if (constraints.minLength != null && t.length < constraints.minLength) {
    issues.push(
      `Caption is too short (${t.length} chars; minimum ${constraints.minLength}).`,
    );
  }
  if (constraints.maxLength != null && t.length > constraints.maxLength) {
    issues.push(
      `Caption is too long (${t.length} chars; maximum ${constraints.maxLength}).`,
    );
  }
  if (
    constraints.maxHashtagCount != null &&
    hashtagCount(t) > constraints.maxHashtagCount
  ) {
    const n = hashtagCount(t);
    issues.push(
      `Too many hashtags (${n}; maximum ${constraints.maxHashtagCount}).`,
    );
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true };
}
