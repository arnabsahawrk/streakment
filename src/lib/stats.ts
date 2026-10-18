import { daysOf, kindOf, reachedCap, type Kind } from "./streak";
import { TIERS, getTier } from "./tiers";
import { WEEKDAYS_LONG, partsOf } from "./zone";

/** Everything on the Stats screen is worked out here, from the streakments
 *  and the failed history the app already stores. Nothing is recorded just
 *  to make a statistic possible, so stats cost the database nothing. */

export interface StatStreak {
  id: string;
  name: string;
  type: string;
  goal_days: number | null;
  start_date: string | null;
  max_streak: number;
  fail_count: number;
  archived: boolean;
  archived_at: string | null;
  stopped_at: string | null;
  created_at: string;
}

export interface StatFail {
  streak_id: string;
  streak_reached: number;
  run_start: string;
  failed_at: string;
}

/** One stretch of days a streakment was running. */
export interface Run {
  streakId: string;
  days: number;
  /** A Become Legend run (the only kind that climbs the milestones). */
  legend: boolean;
}

/** Every Legend run (earlier ones from the failed history, the latest from
 *  the streakment itself) and every Challenge run. Infinite is not a run
 *  here: it has no milestones. */
export function buildRuns(streaks: StatStreak[], fails: StatFail[], nowMs: number): Run[] {
  const kinds = new Map<string, Kind>(streaks.map((s) => [s.id, kindOf(s)]));
  const runs: Run[] = [];
  for (const f of fails) {
    if (kinds.get(f.streak_id) === "legend") {
      runs.push({ streakId: f.streak_id, days: f.streak_reached, legend: true });
    }
  }
  for (const s of streaks) {
    const kind = kindOf(s);
    if (kind === "infinite" || !s.start_date) continue;
    runs.push({ streakId: s.id, days: daysOf(s, nowMs), legend: kind === "legend" });
  }
  return runs;
}

export interface Longest {
  days: number;
  name: string;
  /** The milestone name for a Legend, "Challenge", or "Infinite". */
  badge: string;
}

const RANK: Record<Kind, number> = { challenge: 0, legend: 1, infinite: 2 };

/** The longest run of all: a challenge's (up to its goal), a Legend's (up to
 *  365) or an Infinite's (no limit; a live one counts as it stands, a
 *  stopped one at its final count). So it starts as a challenge, becomes 365
 *  after a Legend, and after Infinite it is that count until it stops. */
export function longestRun(streaks: StatStreak[], nowMs: number): Longest | null {
  let best: { days: number; name: string; kind: Kind } | null = null;
  for (const s of streaks) {
    const kind = kindOf(s);
    const own = daysOf(s, nowMs);
    const days = kind === "infinite" ? own : Math.max(s.max_streak, own);
    if (days <= 0) continue;
    if (!best || days > best.days || (days === best.days && RANK[kind] > RANK[best.kind])) {
      best = { days, name: s.name, kind };
    }
  }
  if (!best) return null;
  const badge = best.kind === "infinite" ? "Infinite" : best.kind === "challenge" ? "Challenge" : getTier(best.days).name;
  return { days: best.days, name: best.name, badge };
}

export interface Overview {
  /** Every fail, ever (the same counter each card keeps). */
  failed: number;
  /** Started, not counting Infinite ones. */
  started: number;
  alive: number;
  paused: number;
  archived: number;
  /** Challenges and Legends that reached their goal / 365, archived or not. */
  completed: number;
  challengesCompleted: number;
  challengesFailed: number;
  legendsReached: number;
  infiniteRunning: number;
  infiniteStopped: number;
  longest: Longest | null;
}

export function overview(streaks: StatStreak[], nowMs: number): Overview {
  const own = streaks.filter((s) => kindOf(s) !== "infinite");
  const infinite = streaks.filter((s) => kindOf(s) === "infinite");

  const done = own.filter((s) => reachedCap(s, nowMs));
  const live = own.filter((s) => !s.archived);
  const paused = live.filter((s) => !s.start_date).length;
  const alive = live.filter((s) => s.start_date && !reachedCap(s, nowMs)).length;

  const challenges = own.filter((s) => kindOf(s) === "challenge");

  return {
    failed: streaks.reduce((n, s) => n + s.fail_count, 0),
    started: own.length,
    alive,
    paused,
    archived: own.length - live.length,
    completed: done.length,
    challengesCompleted: challenges.filter((s) => reachedCap(s, nowMs)).length,
    // A challenge fails by being archived before its goal.
    challengesFailed: challenges.filter((s) => s.archived && !reachedCap(s, nowMs)).length,
    legendsReached: done.filter((s) => kindOf(s) === "legend").length,
    infiniteRunning: infinite.filter((s) => !s.stopped_at).length,
    infiniteStopped: infinite.filter((s) => !!s.stopped_at).length,
    longest: longestRun(streaks, nowMs),
  };
}

/** How many runs have reached each milestone, across every Become Legend
 *  streakment. One number per milestone, in TIERS order. */
export function tierShelf(runs: Run[]): number[] {
  return TIERS.map((t) => runs.filter((r) => r.legend && r.days >= t.min).length);
}

/** The streakments that have failed most, most first. */
export function mostFailed(streaks: StatStreak[], limit = 5): { name: string; count: number }[] {
  return streaks
    .filter((s) => s.fail_count > 0)
    .sort((a, b) => b.fail_count - a.fail_count)
    .slice(0, limit)
    .map((s) => ({ name: s.name, count: s.fail_count }));
}

export const BLOCKS = ["Night", "Morning", "Afternoon", "Evening"] as const;
export const BLOCK_HOURS = ["00–06", "06–12", "12–18", "18–24"] as const;
export const GRID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const BLOCK_PLURAL = ["nights", "mornings", "afternoons", "evenings"] as const;

export const NO_PATTERN_LINE = "A pattern shows up after a few more fails.";

export interface FailPattern {
  /** Seven rows (Mon to Sun) by four columns (Night to Evening). */
  grid: number[][];
  max: number;
  total: number;
  /** "Most fails land on Sunday evenings." or the plain fallback. */
  line: string;
  /** Row and column of the one clear top cell, if there is one. */
  top: { row: number; col: number } | null;
}

/** When fails tend to happen, by weekday and part of the day, read in the
 *  zone being displayed. Every fail counts: a Legend's and a failed
 *  Challenge's. */
export function failPattern(fails: StatFail[], tz: string): FailPattern {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  let total = 0;
  for (const f of fails) {
    const at = Date.parse(f.failed_at);
    if (Number.isNaN(at)) continue;
    const p = partsOf(at, tz);
    grid[(p.wd + 6) % 7][Math.floor(p.h / 6)]++;
    total++;
  }

  const max = Math.max(0, ...grid.map((r) => Math.max(...r)));
  const tops: { row: number; col: number }[] = [];
  grid.forEach((r, row) => r.forEach((n, col) => n === max && max > 0 && tops.push({ row, col })));

  // Only say it with enough to say it honestly: at least 4 fails, and one
  // single top cell with at least 2. A tie makes no claim.
  const top = total >= 4 && max >= 2 && tops.length === 1 ? tops[0] : null;
  const line = top
    ? `Most fails land on ${WEEKDAYS_LONG[(top.row + 1) % 7]} ${BLOCK_PLURAL[top.col]}.`
    : NO_PATTERN_LINE;
  return { grid, max, total, line, top };
}

export interface StatsModel {
  overview: Overview;
  /** Runs that reached each milestone, in TIERS order. */
  tiers: number[];
  mostFailed: { name: string; count: number }[];
  pattern: FailPattern;
}

export function buildStats(streaks: StatStreak[], fails: StatFail[], nowMs: number, tz: string): StatsModel {
  return {
    overview: overview(streaks, nowMs),
    tiers: tierShelf(buildRuns(streaks, fails, nowMs)),
    mostFailed: mostFailed(streaks),
    pattern: failPattern(fails, tz),
  };
}

