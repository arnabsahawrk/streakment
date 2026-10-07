import { currentStreakDays, CHALLENGE_CAP, LEGEND_CAP, displayDays } from "./streak";
import { getTier, nextTier, LEGEND_MIN, type Tier } from "./tiers";
import { dayWord } from "./format";

export const NEUTRAL = "#8A8578";
export const GOLD = "#FFC233";

export const PAUSED_LINE = "Paused. Begin when ready.";
export const CHALLENGE_DONE_LINE = "Promise kept.";

export const CHALLENGE_PRESETS = [3, 7, 21, 30];
export const MAX_GOAL_DAYS = 365;

export interface StreakView {
  isPaused: boolean;
  isChallenge: boolean;
  /** A challenge reached its goal, or a legend streak reached Legend.
   *  Either way it has arrived somewhere worth stopping at. */
  isFinished: boolean;
  days: number;
  goalDays: number | null;
  /** Capped string for display: "365+" / "999+" past the ceiling. */
  daysLabel: string;
  progress: number;
  color: string;
  tier: Tier | null;
  upNext: Tier | null;
  /** The one short line under the counter. Empty when there's nothing
   *  worth saying beyond the number itself. */
  line: string;
  caption: string;
  /** Best streak is only meaningful on a legend streak. A challenge
   *  either reaches its goal or it doesn't - a personal best is noise
   *  there. */
  showsBest: boolean;
}

/** Single source of truth for how a streak renders. The card, the
 *  roadmap and the archive detail all read from here so they cannot
 *  drift apart. */
export function viewOf(
  s: {
    start_date: string | null;
    type?: string | null;
    goal_days?: number | null;
  },
  /** The moment to count to. Cards pass the live clock's moment so the day
   *  flips on time even if the device clock is a little off. */
  asOf: string | Date | number = new Date(),
): StreakView {
  const isChallenge = (s.type ?? "legend") === "challenge" && !!s.goal_days;
  const goalDays = isChallenge ? (s.goal_days as number) : null;
  const isPaused = s.start_date === null;
  const days = currentStreakDays(s.start_date, asOf);
  const cap = isChallenge ? CHALLENGE_CAP : LEGEND_CAP;

  if (isPaused) {
    return {
      isPaused: true,
      isChallenge,
      isFinished: false,
      days: 0,
      goalDays,
      daysLabel: "0",
      progress: 0,
      color: NEUTRAL,
      tier: null,
      upNext: null,
      line: PAUSED_LINE,
      caption: "PAUSED",
      showsBest: !isChallenge,
    };
  }

  const tier = getTier(days);

  if (isChallenge) {
    const goal = goalDays as number;
    const done = days >= goal;
    return {
      isPaused: false,
      isChallenge: true,
      isFinished: done,
      days,
      goalDays: goal,
      daysLabel: displayDays(days, cap),
      progress: Math.min(1, days / goal),
      color: done ? GOLD : tier.color,
      tier: null,
      upNext: null,
      line: done ? CHALLENGE_DONE_LINE : "",
      caption: done ? "COMPLETE" : `OF ${goal} ${dayWord(goal).toUpperCase()}`,
      showsBest: false,
    };
  }

  const upNext = nextTier(days);
  return {
    isPaused: false,
    isChallenge: false,
    isFinished: days >= LEGEND_MIN,
    days,
    goalDays: null,
    daysLabel: displayDays(days, cap),
    progress: upNext ? (days - tier.min) / (upNext.min - tier.min) : 1,
    color: tier.color,
    tier,
    upNext,
    line: tier.name,
    caption: dayWord(days).toUpperCase(),
    showsBest: true,
  };
}
