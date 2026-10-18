import { LEGEND_MIN, TIERS, type Tier } from "./tiers";
import { currentStreakDays, kindOf, type RuleRow } from "./streak";

/** The days the ten milestones start on: 1, 3, 7, 15, 21, 30, 60, 90, 180, 365. */
export const MILESTONE_DAYS: readonly number[] = TIERS.map((t) => t.min);

/** The highest milestone reached after `days` days (never past Legend), or
 *  null before day 1. "Has reached", not "is exactly on", so a day the cron
 *  missed can never lose an email. */
export function highestMilestone(days: number): Tier | null {
  let found: Tier | null = null;
  for (const t of TIERS) if (days >= t.min && t.min <= LEGEND_MIN) found = t;
  return found;
}

export interface PendingRow extends RuleRow {
  fail_count?: number | null;
  email_enabled?: boolean | null;
}

export interface PendingEmail {
  kind: "milestone" | "challenge_complete";
  /** The milestone's first day, or the challenge length. */
  day: number;
  /** What the email ledger records. A Legend that failed and began again
   *  gets its milestones emailed again, so a later run adds "-r<fails>". */
  marker: string;
}

/** Which email, if any, is due for this streakment right now. Pure, so the
 *  daily cron and the tests use the very same rule.
 *
 *  - Infinite, paused, archived, or muted: nothing.
 *  - Challenge: once its goal is reached, `challenge_complete`.
 *  - Legend: the highest milestone reached, capped at 365. */
export function pendingEmail(
  s: PendingRow,
  asOf: string | Date | number = new Date(),
): PendingEmail | null {
  const kind = kindOf(s);
  if (kind === "infinite" || s.archived || !s.start_date || s.email_enabled === false) return null;

  const days = currentStreakDays(s.start_date, asOf);
  if (days < 1) return null;

  if (kind === "challenge") {
    const goal = s.goal_days as number;
    return days >= goal ? { kind: "challenge_complete", day: goal, marker: String(goal) } : null;
  }

  const tier = highestMilestone(days);
  if (!tier) return null;
  const run = s.fail_count ?? 0;
  return { kind: "milestone", day: tier.min, marker: run > 0 ? `${tier.min}-r${run}` : String(tier.min) };
}
