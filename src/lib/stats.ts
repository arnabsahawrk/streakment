import { currentStreakDays } from "./streak";
import { TIERS } from "./tiers";
import { DAY_MS, WEEKDAYS_LONG, partsOf } from "./zone";

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
  start: number;
  end: number;
  days: number;
  legend: boolean;
  /** Ended by a reset (as opposed to still running, or archived). */
  broken: boolean;
}

export function buildRuns(streaks: StatStreak[], resets: StatReset[], nowMs: number): Run[] {
  const legend = new Map(streaks.map((s) => [s.id, s.type !== "challenge"]));
  const runs: Run[] = [];
  for (const r of resets) {
    const start = Date.parse(r.run_start);
    const end = Date.parse(r.reset_at);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    runs.push({
      streakId: r.streak_id,
      start,
      end,
      days: r.streak_reached,
      legend: legend.get(r.streak_id) ?? true,
      broken: true,
    });
  }
  for (const s of streaks) {
    if (!s.start_date) continue;
    const start = Date.parse(s.start_date);
    if (Number.isNaN(start)) continue;
    const end = s.archived ? (s.archived_at ? Date.parse(s.archived_at) : start) : nowMs;
    runs.push({
      streakId: s.id,
      start,
      end,
      days: currentStreakDays(s.start_date, end),
      legend: s.type !== "challenge",
      broken: false,
    });
  }
  return runs;
}

/** How many times a day counter ticked over inside the last `windowDays`,
 *  added up across every streakment. It counts exactly what the lifetime
 *  "days lit" total counts (each completed day of each run), just limited
 *  to the window - so a recent window can never exceed the lifetime figure. */
export function litWithin(runs: Run[], nowMs: number, windowDays: number): number {
  const from = nowMs - windowDays * DAY_MS;
  let total = 0;
  for (const r of runs) {
    const a = Math.max(r.start, from);
    const b = Math.min(r.end, nowMs);
    if (b <= a) continue;
    total += Math.floor((b - r.start) / DAY_MS) - Math.floor((a - r.start) / DAY_MS);
  }
  return total;
}

export interface Overview {
  started: number;
  alive: number;
  paused: number;
  archived: number;
  /** Every break, ever (the same counter each card's "Break" shows). */
  resets: number;
  daysLit: number;
  litWeek: number;
  litMonth: number;
  longest: { days: number; name: string } | null;
  /** Average length of a run that ended in a break, in days. */
  avgRun: number | null;
  challengesMet: number;
  challengesMissed: number;
}

export function overview(streaks: StatStreak[], runs: Run[], nowMs: number): Overview {
  const live = streaks.filter((s) => !s.archived);
  const paused = live.filter((s) => !s.start_date).length;

  let longest: Overview["longest"] = null;
  for (const s of streaks) {
    const running = !s.archived ? currentStreakDays(s.start_date, nowMs) : 0;
    const best = Math.max(s.max_streak, running);
    if (best > 0 && (!longest || best > longest.days)) longest = { days: best, name: s.name };
  }

  const broken = runs.filter((r) => r.broken && r.days >= 1);
  const avgRun = broken.length ? broken.reduce((n, r) => n + r.days, 0) / broken.length : null;

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
    daysLit: runs.reduce((n, r) => n + r.days, 0),
    litWeek: litWithin(runs, nowMs, 7),
    litMonth: litWithin(runs, nowMs, 30),
    longest,
    avgRun,
    challengesMet: met,
    challengesMissed: missed,
  };
}

/** How many runs have reached each tier, across every Become Legend
 *  streakment. One number per tier, in TIERS order. */
export function tierShelf(runs: Run[]): number[] {
  return TIERS.map((t) => runs.filter((r) => r.legend && r.days >= t.min).length);
}

/** The streakments that have broken most, most first. */
export function mostBroken(streaks: StatStreak[], limit = 5): { name: string; count: number }[] {
  return streaks
    .filter((s) => s.reset_count > 0)
    .sort((a, b) => b.reset_count - a.reset_count)
    .slice(0, limit)
    .map((s) => ({ name: s.name, count: s.reset_count }));
}

/** How long it takes to come back: the gap between a break and the next
 *  Begin, over every break that has been followed by one. */
export function comebacks(
  streaks: StatStreak[],
  resets: StatReset[],
): { n: number; avgMs: number; fastestMs: number } | null {
  const byStreak = new Map<string, StatReset[]>();
  for (const r of resets) {
    const list = byStreak.get(r.streak_id) ?? [];
    list.push(r);
    byStreak.set(r.streak_id, list);
  }
  const gaps: number[] = [];
  for (const s of streaks) {
    const list = (byStreak.get(s.id) ?? []).sort((a, b) => Date.parse(a.reset_at) - Date.parse(b.reset_at));
    list.forEach((r, i) => {
      const next = i + 1 < list.length ? list[i + 1].run_start : s.start_date;
      if (!next) return;
      const gap = Date.parse(next) - Date.parse(r.reset_at);
      if (Number.isFinite(gap) && gap >= 0) gaps.push(gap);
    });
  }
  if (gaps.length === 0) return null;
  return {
    n: gaps.length,
    avgMs: gaps.reduce((a, b) => a + b, 0) / gaps.length,
    fastestMs: Math.min(...gaps),
  };
}

export const BLOCKS = ["Night", "Morning", "Afternoon", "Evening"] as const;
const BLOCK_WORD = ["nights", "mornings", "afternoons", "evenings"] as const;

export interface BreakPattern {
  /** grid[weekday 0=Sun][block 0-3] */
  grid: number[][];
  total: number;
  max: number;
  /** One plain sentence, only once there is enough to say it honestly. */
  insight: string | null;
}

/** When breaks tend to happen, by weekday and part of the day, read in
 *  the zone being displayed. */
export function breakPattern(resets: StatReset[], tz: string): BreakPattern {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  let max = 0;
  let top = { wd: 0, block: 0 };
  for (const r of resets) {
    const ms = Date.parse(r.reset_at);
    if (Number.isNaN(ms)) continue;
    const p = partsOf(ms, tz);
    const block = Math.floor(p.h / 6);
    grid[p.wd][block]++;
    if (grid[p.wd][block] > max) {
      max = grid[p.wd][block];
      top = { wd: p.wd, block };
    }
  }
  const total = resets.length;
  const insight =
    total >= 4 && max >= 2 ? `Most breaks land on ${WEEKDAYS_LONG[top.wd]} ${BLOCK_WORD[top.block]}.` : null;
  return { grid, total, max, insight };
}

export interface StatsModel {
  overview: Overview;
  tiers: number[];
  broken: { name: string; count: number }[];
  comeback: ReturnType<typeof comebacks>;
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
    overview: overview(streaks, runs, nowMs),
    tiers: tierShelf(runs),
    broken: mostBroken(streaks),
    comeback: comebacks(streaks, resets),
    pattern: breakPattern(resets, tz),
  };
}
