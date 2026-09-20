import { currentStreakDays, SPRINT_CAP, ASCENT_CAP, displayDays } from "./streak";
import { getTier, nextTier, LEGEND_MIN, type Tier } from "./tiers";
import { dayWord } from "./format";

export const NEUTRAL = "#8A8578";
export const GOLD = "#E0A82E";

export const PAUSED_LINE = "No rush. Begin again when you're ready.";
export const SPRINT_DONE_LINE = "Promise kept.";

export const SPRINT_PRESETS = [3, 7, 21, 30];
/** Backwards-compatible name used by the challenge creation UI. */
export const CHALLENGE_PRESETS = SPRINT_PRESETS;
export const MAX_GOAL_DAYS = 365;

export interface StreakView {
  isPaused: boolean;
  isSprint: boolean;
  /** Sprint reached its goal, or an Ascent reached Legend. Either way the
   *  streak has arrived somewhere worth stopping at. */
  isFinished: boolean;
  days: number;
  goalDays: number | null;
  /** Capped string for display: "365+" / "999+" past the ceiling. */
  daysLabel: string;
  progress: number;
  color: string;
  tier: Tier | null;
  upNext: Tier | null;
  line: string;
  caption: string;
  pill: string | null;
  /** Best streak is only meaningful on an Ascent. A Sprint either reaches
   *  its goal or it doesn't - a personal best is noise there. */
  showsBest: boolean;
}

/** Single source of truth for how a streak renders. The card, the share
 *  image, the roadmap and the archive detail all read from here so they
 *  cannot drift apart. */
export function viewOf(s: {
  start_date: string | null;
  kind?: string | null;
  goal_days?: number | null;
}): StreakView {
  const isSprint = (s.kind ?? "ascent") === "sprint" && !!s.goal_days;
  const goalDays = isSprint ? (s.goal_days as number) : null;
  const isPaused = s.start_date === null;
  const days = currentStreakDays(s.start_date);
  const cap = isSprint ? SPRINT_CAP : ASCENT_CAP;

  if (isPaused) {
    return {
      isPaused: true,
      isSprint,
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
      pill: isSprint ? `${goalDays}-DAY CHALLENGE` : null,
      showsBest: !isSprint,
    };
  }

  const tier = getTier(days);

  if (isSprint) {
    const goal = goalDays as number;
    const done = days >= goal;
    return {
      isPaused: false,
      isSprint: true,
      isFinished: done,
      days,
      goalDays: goal,
      daysLabel: displayDays(days, cap),
      progress: Math.min(1, days / goal),
      color: done ? GOLD : tier.color,
      tier: null,
      upNext: null,
      line: done ? SPRINT_DONE_LINE : tier.line,
      caption: done ? "COMPLETE" : `OF ${goal} ${dayWord(goal).toUpperCase()}`,
      pill: `${goal}-DAY CHALLENGE`,
      showsBest: false,
    };
  }

  const upNext = nextTier(days);
  return {
    isPaused: false,
    isSprint: false,
    isFinished: days >= LEGEND_MIN,
    days,
    goalDays: null,
    daysLabel: displayDays(days, cap),
    progress: upNext ? (days - tier.min) / (upNext.min - tier.min) : 1,
    color: tier.color,
    tier,
    upNext,
    line: tier.line,
    caption: dayWord(days).toUpperCase(),
    pill: tier.name,
    showsBest: true,
  };
}
