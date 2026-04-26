export { engagementScore } from "@/lib/post-timing";

/** Block repost if the source post was this many days ago or less. */
export const REPOST_COOLDOWN_DAYS = 14;

/** Suggestion pill: well-performing posts older than the cooldown. */
export const REPOST_SUGGESTION_MIN_SCORE = 4;

export function isWithinCooldown(
  postInstant: Date,
  now: Date = new Date(),
  cooldownDays = REPOST_COOLDOWN_DAYS,
): boolean {
  return now.getTime() - postInstant.getTime() < cooldownDays * 86_400_000;
}
