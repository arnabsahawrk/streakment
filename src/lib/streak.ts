/** The one set of rules. Every screen, route and test reads these, so they
 *  cannot disagree.
 *
 *  Three layers:
 *   - challenge: counts to its goal (1 to 365) and stops. Do or die.
 *   - legend:    counts to 365 and stops.
 *   - infinite:  no limit, until it is stopped for good.
 *
 *  Day counts are worked out from start_date, never stored. A null
 *  start_date means a paused Legend: zero everywhere. */

export const DAY_MS = 86_400_000;
export const LEGEND_DAYS = 365;
export const MAX_GOAL_DAYS = 365;

export type Kind = "challenge" | "legend" | "infinite";

/** The few fields the rules need. A database row satisfies it. */
export interface RuleRow {
  type?: string | null;
  goal_days?: number | null;
  start_date?: string | Date | null;
  archived?: boolean | null;
  archived_at?: string | Date | null;
  stopped_at?: string | Date | null;
}

const ms = (d: string | Date | number): number => new Date(d).getTime();

export function kindOf(row: Pick<RuleRow, "type" | "goal_days">): Kind {
  if (row.type === "infinite") return "infinite";
  if (row.type === "challenge" && row.goal_days) return "challenge";
  return "legend";
}

/** Where counting stops: the goal, 365, or nowhere (null) for Infinite. */
export function capOf(row: Pick<RuleRow, "type" | "goal_days">): number | null {
  const kind = kindOf(row);
  if (kind === "challenge") return row.goal_days as number;
  if (kind === "legend") return LEGEND_DAYS;
  return null;
}

/** Whole days since start_date, never capped. Paused (null) is 0. */
export function currentStreakDays(
  startDate: string | Date | null | undefined,
  asOf: string | Date | number = new Date(),
): number {
  if (!startDate) return 0;
  const start = ms(startDate);
  const end = ms(asOf);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

/** The moment counting ends: when an archived row was archived, when an
 *  Infinite was stopped, otherwise the moment asked about. */
export function endOf(row: RuleRow, asOf: string | Date | number = new Date()): number {
  if (row.archived && row.archived_at) return ms(row.archived_at);
  if (row.stopped_at) return ms(row.stopped_at);
  return ms(asOf);
}

/** The count to show: capped at the goal or 365, uncapped for Infinite,
 *  frozen at archived_at / stopped_at once there is one. */
export function daysOf(row: RuleRow, asOf: string | Date | number = new Date()): number {
  const raw = currentStreakDays(row.start_date, endOf(row, asOf));
  const cap = capOf(row);
  return cap === null ? raw : Math.min(raw, cap);
}

/** Did it get as far as its goal (challenge) or 365 days (legend)? True for
 *  archived rows too, judged at the moment they were archived. */
export function reachedCap(row: RuleRow, asOf: string | Date | number = new Date()): boolean {
  const cap = capOf(row);
  if (cap === null || !row.start_date) return false;
  return currentStreakDays(row.start_date, endOf(row, asOf)) >= cap;
}

/** Completed = reached its cap and not archived yet. Never stored. */
export function isCompleted(row: RuleRow, asOf: string | Date | number = new Date()): boolean {
  return !row.archived && reachedCap(row, asOf);
}

/** When it completes (or completed): start plus the cap, in ms. Null for
 *  Infinite and for a paused Legend. */
export function completionMs(row: RuleRow): number | null {
  const cap = capOf(row);
  if (cap === null || !row.start_date) return null;
  return ms(row.start_date) + cap * DAY_MS;
}

export function isStopped(row: RuleRow): boolean {
  return kindOf(row) === "infinite" && !!row.stopped_at;
}

/** A Legend that failed and is waiting for Begin. */
export function isPaused(row: RuleRow): boolean {
  return kindOf(row) === "legend" && !row.archived && row.start_date == null;
}
