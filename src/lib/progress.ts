import {
  capOf,
  daysOf,
  isCompleted,
  isStopped,
  kindOf,
  reachedCap,
  type Kind,
  type RuleRow,
} from "./streak";
import {
  FOIL_PAINT,
  GOLD,
  LEGEND_TIER,
  NEUTRAL,
  NEUTRAL_PAINT,
  ZERO_STATE,
  getTier,
  nextTier,
  type Paint,
  type Tier,
} from "./tiers";
import { dayWord, fmtNum } from "./format";

export { GOLD, NEUTRAL };
export { MAX_GOAL_DAYS } from "./streak";

export const PAUSED_LINE = "Never miss twice. Begin again.";
export const CHALLENGE_PRESETS = [3, 7, 21, 30];

/** What `viewOf` needs from a streakment (a database row or an API object). */
export interface ViewRow extends RuleRow {
  max_streak?: number | null;
  renamed?: boolean | null;
}

export interface StreakView {
  kind: Kind;
  isPaused: boolean;
  /** Reached its goal / 365 and not archived yet. */
  isCompleted: boolean;
  /** An Infinite that was stopped for good. */
  isStopped: boolean;
  isArchived: boolean;
  /** The count to show: capped at the goal or 365, never past it. */
  days: number;
  cap: number | null;
  goalDays: number | null;
  /** `days` with thousands separators, or "—" while paused. */
  daysLabel: string;
  /** 0 to 1, for the ring. */
  progress: number;
  /** The milestone (or day colour) it is on. */
  tier: Tier;
  /** Legend only: the next milestone, null once at 365. */
  upNext: Tier | null;
  daysToNext: number | null;
  /** Challenge only: days left to the goal. */
  daysToGo: number | null;
  paint: Paint;
  /** The solid colour of `paint`. */
  color: string;
  /** The one short line under the count (empty once completed: the badge says it). */
  line: string;
  caption: string;
  /** "Best: 12 days · 3 days to Control" on a Legend. Empty otherwise. */
  detail: string;
  /** "Completed", "Legend" or "Stopped"; null otherwise. */
  badge: string | null;
  /** A Legend's best run (never more than 365). */
  best: number | null;
  /** The foil may shimmer, but not once stopped. */
  shimmer: boolean;

  canRename: boolean;
  canFail: boolean;
  canBegin: boolean;
  /** Completed: Finish and Archive. */
  canFinish: boolean;
  /** Completed Legend: Archive and Infinite. */
  canArchiveInfinite: boolean;
  /** Legend, not completed: the small flag. */
  canArchiveEarly: boolean;
  canStop: boolean;
  /** The mute-emails bell. */
  canMute: boolean;
}

const NO_ACTIONS = {
  canRename: false,
  canFail: false,
  canBegin: false,
  canFinish: false,
  canArchiveInfinite: false,
  canArchiveEarly: false,
  canStop: false,
  canMute: false,
};

/** Single source of truth for how a streakment renders. The card, the
 *  roadmap, the archive and the stats all read from here so they cannot
 *  drift apart. */
export function viewOf(
  s: ViewRow,
  /** The moment to count to. Cards pass the live clock's moment so the day
   *  flips on time even if the device clock is a little off. */
  asOf: string | Date | number = new Date(),
): StreakView {
  const kind = kindOf(s);
  const cap = capOf(s);
  const archived = !!s.archived;
  const stopped = isStopped(s);
  const days = daysOf(s, asOf);
  const completed = isCompleted(s, asOf);
  const paused = kind === "legend" && !archived && s.start_date == null;
  const best = Math.max(s.max_streak ?? 0, days);
  const common = {
    kind,
    isPaused: paused,
    isCompleted: completed,
    isStopped: stopped,
    isArchived: archived,
    cap,
    goalDays: kind === "challenge" ? cap : null,
  };

  // ---- Infinite: a big count in the foil. Nothing else.
  if (kind === "infinite") {
    return {
      ...common,
      days,
      daysLabel: fmtNum(days),
      progress: 1,
      tier: LEGEND_TIER,
      upNext: null,
      daysToNext: null,
      daysToGo: null,
      paint: FOIL_PAINT,
      color: FOIL_PAINT.solid,
      line: stopped ? "Stopped" : "Infinite",
      caption: dayWord(days).toUpperCase(),
      detail: "",
      badge: stopped ? "Stopped" : null,
      best: null,
      shimmer: !stopped,
      ...NO_ACTIONS,
      canStop: !stopped,
    };
  }

  const canRename = !archived && !s.renamed && !completed;
  const canMute = !archived;

  // ---- A Legend that failed: waiting for Begin.
  if (paused) {
    return {
      ...common,
      days: 0,
      daysLabel: "—",
      progress: 0,
      tier: ZERO_STATE,
      upNext: null,
      daysToNext: null,
      daysToGo: null,
      paint: NEUTRAL_PAINT,
      color: NEUTRAL,
      line: PAUSED_LINE,
      caption: "PAUSED",
      detail: best > 0 ? `Best: ${fmtNum(best)} ${dayWord(best)}` : "",
      badge: null,
      best,
      shimmer: false,
      ...NO_ACTIONS,
      canRename,
      canBegin: true,
      canArchiveEarly: true,
      canMute,
    };
  }

  const tier = getTier(days);

  // ---- Accept Challenge: wears the colour of the day it is on.
  if (kind === "challenge") {
    const goal = cap as number;
    const toGo = Math.max(0, goal - days);
    return {
      ...common,
      days,
      daysLabel: fmtNum(days),
      progress: Math.min(1, days / goal),
      tier,
      upNext: null,
      daysToNext: null,
      daysToGo: completed ? 0 : toGo,
      paint: tier,
      color: tier.solid,
      // Said once: the badge carries "Completed", so the line goes quiet.
      line: completed ? "" : `${fmtNum(toGo)} ${dayWord(toGo)} to go`,
      caption: `OF ${fmtNum(goal)} ${dayWord(goal).toUpperCase()}`,
      detail: "",
      badge: completed ? "Completed" : null,
      best: null,
      shimmer: tier.foil && !archived,
      ...NO_ACTIONS,
      canRename,
      canFail: !archived && !completed,
      canFinish: completed,
      canMute,
    };
  }

  // ---- Become Legend: ten milestones, then it stops at 365.
  const upNext = nextTier(days);
  const daysToNext = upNext ? upNext.min - days : null;
  // "Best: 12 days · 3 days to Control". A best of 0 says nothing, so it is left out.
  const detail = [
    best > 0 ? `Best: ${fmtNum(best)} ${dayWord(best)}` : "",
    upNext ? `${fmtNum(daysToNext as number)} ${dayWord(daysToNext as number)} to ${upNext.name}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    ...common,
    days,
    daysLabel: fmtNum(days),
    progress: upNext ? (days - tier.min) / (upNext.min - tier.min) : 1,
    tier,
    upNext,
    daysToNext,
    daysToGo: null,
    paint: tier,
    color: tier.solid,
    // Said once: a completed Legend's badge says "Legend", so the line and
    // the "Best" (it is the 365 already shown) go quiet.
    line: completed ? "" : tier.name,
    caption: dayWord(days).toUpperCase(),
    detail: completed ? "" : detail,
    badge: completed ? "Legend" : null,
    best,
    shimmer: tier.foil && !archived,
    ...NO_ACTIONS,
    canRename,
    canFail: !archived && !completed,
    canFinish: completed,
    canArchiveInfinite: completed,
    canArchiveEarly: !archived && !completed,
    canMute,
  };
}

export interface Result {
  tone: "completed" | "failed" | "archived";
  text: string;
}

/** How an archived streakment ended, for the Archive. The numbers are the
 *  capped ones: never past the goal, never past 365. */
export function resultOf(s: ViewRow): Result {
  const kind = kindOf(s);
  const days = daysOf(s);
  if (kind === "challenge") {
    const goal = s.goal_days as number;
    return reachedCap(s)
      ? { tone: "completed", text: `Completed: ${fmtNum(goal)} of ${fmtNum(goal)} ${dayWord(goal)}` }
      : { tone: "failed", text: `Failed: ${fmtNum(days)} of ${fmtNum(goal)} ${dayWord(goal)}` };
  }
  if (reachedCap(s)) return { tone: "completed", text: "Completed: 365 of 365 days" };
  if (!s.start_date) return { tone: "archived", text: "Archived while paused" };
  return { tone: "archived", text: `Archived at ${fmtNum(days)} ${dayWord(days)}` };
}
