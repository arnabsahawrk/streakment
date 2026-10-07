import { currentStreakDays } from "./streak";
import { TIERS } from "./tiers";
import { WEEKDAYS_LONG, partsOf } from "./zone";

/** Everything on the Stats screen is worked out here, from the streaks and
 *  break history the app already stores. Nothing is recorded just to make a
 *  statistic possible, so stats cost the database nothing. */

export interface StatStreak {
  id: string;
  name: string;
  type: string;
  goal_days: number | null;
  start_date: string | null;
  max_streak: number;
  reset_count: number;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface StatReset {
  streak_id: string;
  streak_reached: number;
  run_start: string;
  reset_at: string;
}

/** One stretch of days a streakment was running. */
export interface Run {
  streakId: string;
  days: number;
  /** A Become Legend run (the only kind that climbs the milestones). */
  legend: boolean;
}

export function buildRuns(streaks: StatStreak[], resets: StatReset[], nowMs: number): Run[] {
  const legend = new Map(streaks.map((s) => [s.id, s.type !== "challenge"]));
  const runs: Run[] = resets.map((r) => ({
    streakId: r.streak_id,
    days: r.streak_reached,
    legend: legend.get(r.streak_id) ?? true,
  }));
  for (const s of streaks) {
    if (!s.start_date) continue;
    const end = s.archived ? (s.archived_at ? Date.parse(s.archived_at) : Date.parse(s.start_date)) : nowMs;
    runs.push({ streakId: s.id, days: currentStreakDays(s.start_date, end), legend: s.type !== "challenge" });
  }
  return runs;
}

export interface Overview {
  started: number;
  alive: number;
  paused: number;
  archived: number;
  /** Every reset, ever (the same counter each card's "Break" shows). */
  resets: number;
  longest: { days: number; name: string; challenge: boolean } | null;
  challengesMet: number;
  challengesMissed: number;
}

export function overview(streaks: StatStreak[], nowMs: number): Overview {
  const live = streaks.filter((s) => !s.archived);
  const paused = live.filter((s) => !s.start_date).length;

  let longest: Overview["longest"] = null;
  for (const s of streaks) {
    const running = !s.archived ? currentStreakDays(s.start_date, nowMs) : 0;
    const best = Math.max(s.max_streak, running);
    if (best > 0 && (!longest || best > longest.days)) {
      longest = { days: best, name: s.name, challenge: s.type === "challenge" };
    }
  }

  let met = 0;
  let missed = 0;
  for (const s of streaks) {
    if (!s.archived || s.type !== "challenge" || !s.goal_days) continue;
    const final = s.archived_at ? currentStreakDays(s.start_date, s.archived_at) : 0;
    if (final >= s.goal_days) met++;
    else missed++;
  }

  return {
    started: streaks.length,
    alive: live.length - paused,
    paused,
    archived: streaks.length - live.length,
    resets: streaks.reduce((n, s) => n + s.reset_count, 0),
    longest,
    challengesMet: met,
    challengesMissed: missed,
  };
}

/** How many runs have reached each tier, across every Become Legend
 *  streakment. One number per tier, in TIERS order. */
export function tierShelf(runs: Run[]): number[] {
  return TIERS.map((t) => runs.filter((r) => r.legend && r.days >= t.min).length);
}

/** The streakments that have been reset most, most first. */
export function mostReset(streaks: StatStreak[], limit = 5): { name: string; count: number }[] {
  return streaks
    .filter((s) => s.reset_count > 0)
    .sort((a, b) => b.reset_count - a.reset_count)
    .slice(0, limit)
    .map((s) => ({ name: s.name, count: s.reset_count }));
}

export const BLOCKS = ["Night", "Morning", "Afternoon", "Evening"] as const;
export const BLOCK_HOURS = ["00–06", "06–12", "12–18", "18–24"] as const;
const BLOCK_PHRASE = ["at night", "in the morning", "in the afternoon", "in the evening"] as const;

export interface BreakPattern {
  /** Resets per weekday, Sunday first. */
  byDay: number[];
  /** Resets per part of the day: night, morning, afternoon, evening. */
  byBlock: number[];
  total: number;
  /** One plain sentence, only once there is enough to say it honestly. */
  insight: string | null;
}

/** Index of the single largest value if it appears at least twice and
 *  isn't tied; otherwise -1. */
function clearPeak(values: number[]): number {
  const max = Math.max(...values);
  if (max < 2) return -1;
  const first = values.indexOf(max);
  return values.indexOf(max, first + 1) === -1 ? first : -1;
}

/** When resets tend to happen, by weekday and part of the day, read in
 *  the zone being displayed. */
export function breakPattern(resets: StatReset[], tz: string): BreakPattern {
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  const byBlock = [0, 0, 0, 0];
  let total = 0;
  for (const r of resets) {
    const ms = Date.parse(r.reset_at);
    if (Number.isNaN(ms)) continue;
    const p = partsOf(ms, tz);
    byDay[p.wd]++;
    byBlock[Math.floor(p.h / 6)]++;
    total++;
  }

  let insight: string | null = null;
  if (total >= 4) {
    const d = clearPeak(byDay);
    const b = clearPeak(byBlock);
    if (d >= 0 && b >= 0) insight = `Most resets happen on ${WEEKDAYS_LONG[d]}s, ${BLOCK_PHRASE[b]}.`;
    else if (d >= 0) insight = `Most resets happen on ${WEEKDAYS_LONG[d]}s.`;
    else if (b >= 0) insight = `Most resets happen ${BLOCK_PHRASE[b]}.`;
  }
  return { byDay, byBlock, total, insight };
}

export interface StatsModel {
  overview: Overview;
  tiers: number[];
  mostReset: { name: string; count: number }[];
  pattern: BreakPattern;
}

export function buildStats(
  streaks: StatStreak[],
  resets: StatReset[],
  nowMs: number,
  tz: string,
): StatsModel {
  const runs = buildRuns(streaks, resets, nowMs);
  return {
    overview: overview(streaks, nowMs),
    tiers: tierShelf(runs),
    mostReset: mostReset(streaks),
    pattern: breakPattern(resets, tz),
  };
}
