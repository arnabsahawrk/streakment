import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS } from "../src/lib/streak";
import { TIERS } from "../src/lib/tiers";
import {
  NO_PATTERN_LINE,
  buildRuns,
  buildStats,
  failPattern,
  longestRun,
  overview,
  tierShelf,
  type StatFail,
  type StatStreak,
} from "../src/lib/stats";

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (days: number) => NOW - days * DAY_MS;

let n = 0;
function s(partial: Partial<StatStreak> & Pick<StatStreak, "type">): StatStreak {
  n++;
  return {
    id: `id-${n}`,
    name: `Streakment ${n}`,
    goal_days: null,
    start_date: iso(ago(1)),
    max_streak: 0,
    fail_count: 0,
    archived: false,
    archived_at: null,
    stopped_at: null,
    created_at: iso(ago(1000 - n)),
    ...partial,
  };
}

// A scenario with every layer and every ending.
const c1 = s({ type: "challenge", name: "c1 completed, not archived", goal_days: 7, start_date: iso(ago(10)) });
const c2 = s({ type: "challenge", name: "c2 failed", goal_days: 21, start_date: iso(ago(50)), archived: true, archived_at: iso(ago(50) + 8 * DAY_MS + 3 * 3_600_000), max_streak: 8, fail_count: 1 });
const c3 = s({ type: "challenge", name: "c3 completed and archived", goal_days: 3, start_date: iso(ago(40)), archived: true, archived_at: iso(ago(40) + 5 * DAY_MS), max_streak: 3 });
const l1 = s({ type: "legend", name: "l1 completed, not archived", start_date: iso(ago(400)) });
const l2 = s({ type: "legend", name: "l2 running, failed twice", start_date: iso(ago(100)), fail_count: 2, max_streak: 40 });
const l3 = s({ type: "legend", name: "l3 went infinite", start_date: iso(ago(380)), archived: true, archived_at: iso(ago(380) + 369 * DAY_MS), max_streak: 365 });
const l4 = s({ type: "legend", name: "l4 paused", start_date: null, fail_count: 1, max_streak: 12 });
const i1 = s({ type: "infinite", name: "i1 counting", start_date: iso(ago(380)) });
const i2 = s({ type: "infinite", name: "i2 stopped", start_date: iso(ago(600)), stopped_at: iso(ago(600) + 500 * DAY_MS) });
const streaks = [c1, c2, c3, l1, l2, l3, l4, i1, i2];

const fail = (streak: StatStreak, reached: number, failedAt: number): StatFail => ({
  streak_id: streak.id,
  streak_reached: reached,
  run_start: iso(failedAt - reached * DAY_MS),
  failed_at: iso(failedAt),
});
const fails = [fail(c2, 8, ago(50) + 8 * DAY_MS), fail(l2, 5, ago(90)), fail(l2, 40, ago(60)), fail(l4, 12, ago(5))];

test("overview counts every layer and ending", () => {
  const o = overview(streaks, NOW);
  assert.equal(o.failed, 4, "all fails, ever");
  assert.equal(o.started, 7, "started does not count Infinite rows");
  assert.equal(o.archived, 3);
  assert.equal(o.paused, 1);
  assert.equal(o.alive, 1, "running and not completed: only l2");
  assert.equal(o.completed, 4, "c1, c3, l1, l3 reached their goal / 365 (archived or not)");
  assert.equal(o.challengesCompleted, 2);
  assert.equal(o.challengesFailed, 1);
  assert.equal(o.legendsReached, 2);
  assert.equal(o.infiniteRunning, 1);
  assert.equal(o.infiniteStopped, 1);
});

test("longest run: a challenge first, 365 after a Legend, then the Infinite count", () => {
  assert.deepEqual(longestRun([c1], NOW), { days: 7, name: c1.name, badge: "Challenge" });
  const early = longestRun([c2, c1], NOW);
  assert.equal(early?.days, 8);
  assert.equal(early?.badge, "Challenge");

  assert.deepEqual(longestRun([c1, l1], NOW), { days: 365, name: l1.name, badge: "Legend" });
  assert.equal(longestRun([l2, c2], NOW)?.days, 100);
  assert.equal(longestRun([l2, c2], NOW)?.badge, "Dedicated", "a Legend run wears its milestone name");

  const live = longestRun([l1, i1], NOW);
  assert.deepEqual(live, { days: 380, name: i1.name, badge: "Infinite" }, "a live Infinite counts as it stands");

  const stopped = longestRun([l1, i1, i2], NOW);
  assert.deepEqual(stopped, { days: 500, name: i2.name, badge: "Infinite" }, "a stopped Infinite counts at its final number");

  assert.equal(longestRun([], NOW), null);
});

test("on a tie the further layer wins", () => {
  const legendAt365 = s({ type: "legend", start_date: iso(ago(365)) });
  const infiniteAt365 = s({ type: "infinite", start_date: iso(ago(365)) });
  assert.equal(longestRun([legendAt365, infiniteAt365], NOW)?.badge, "Infinite");
});

test("runs: a Legend's earlier runs come from the fail log, challenges only count once", () => {
  const runs = buildRuns(streaks, fails, NOW);
  const legendRuns = runs.filter((r) => r.legend).map((r) => r.days).sort((a, b) => a - b);
  assert.deepEqual(legendRuns, [5, 12, 40, 100, 365, 365]);
  const challengeRuns = runs.filter((r) => !r.legend).map((r) => r.days).sort((a, b) => a - b);
  assert.deepEqual(challengeRuns, [3, 7, 8], "the failed challenge's fail row is not a second run");
  assert.equal(runs.some((r) => r.streakId === i1.id || r.streakId === i2.id), false, "Infinite has no milestones");
});

test("milestones reached: legend runs only, per milestone", () => {
  const shelf = tierShelf(buildRuns(streaks, fails, NOW));
  assert.equal(shelf.length, TIERS.length);
  assert.deepEqual(shelf, [6, 6, 5, 4, 4, 4, 3, 3, 2, 2]);
});

test("a challenge that is still running is neither completed nor failed", () => {
  const running = s({ type: "challenge", goal_days: 30, start_date: iso(ago(4)) });
  const o = overview([running], NOW);
  assert.equal(o.challengesCompleted, 0);
  assert.equal(o.challengesFailed, 0);
  assert.equal(o.alive, 1);
});

test("failed most: ranked, top five", () => {
  const stats = buildStats(streaks, fails, NOW, "UTC");
  assert.equal(stats.mostFailed[0].name, l2.name);
  assert.equal(stats.mostFailed[0].count, 2);
  assert.deepEqual(stats.mostFailed.map((m) => m.count), [2, 1, 1]);
  const many = Array.from({ length: 8 }, (_, i) => s({ type: "legend", fail_count: i + 1 }));
  assert.equal(buildStats(many, [], NOW, "UTC").mostFailed.length, 5);
});

// ---- When I failed: weekday x time of day (2026-10-04 is a Sunday)
const f = (iso8601: string): StatFail => ({ streak_id: "x", streak_reached: 3, run_start: iso8601, failed_at: iso8601 });

test("fail grid: Mon to Sun rows, Night/Morning/Afternoon/Evening columns", () => {
  const p = failPattern([f("2026-10-04T19:00:00Z"), f("2026-10-04T20:30:00Z"), f("2026-10-04T18:00:00Z"), f("2026-10-05T08:00:00Z")], "UTC");
  assert.equal(p.grid.length, 7);
  assert.ok(p.grid.every((r) => r.length === 4));
  assert.equal(p.grid[6][3], 3, "Sunday evening");
  assert.equal(p.grid[0][1], 1, "Monday morning");
  assert.equal(p.total, 4);
  assert.equal(p.max, 3);
  assert.deepEqual(p.top, { row: 6, col: 3 });
  assert.equal(p.line, "Most fails land on Sunday evenings.");
});

test("fail grid: the pattern line needs 4 fails and one clear top cell of at least 2", () => {
  assert.equal(failPattern([f("2026-10-04T19:00:00Z"), f("2026-10-04T19:10:00Z"), f("2026-10-04T19:20:00Z")], "UTC").line, NO_PATTERN_LINE, "only 3 fails");
  assert.equal(
    failPattern([f("2026-10-04T19:00:00Z"), f("2026-10-04T19:10:00Z"), f("2026-10-02T02:00:00Z"), f("2026-10-02T03:00:00Z")], "UTC").line,
    NO_PATTERN_LINE,
    "a tie makes no claim",
  );
  assert.equal(
    failPattern([f("2026-10-04T19:00:00Z"), f("2026-10-05T08:00:00Z"), f("2026-10-06T14:00:00Z"), f("2026-10-07T03:00:00Z")], "UTC").line,
    NO_PATTERN_LINE,
    "no cell has 2",
  );
  assert.equal(failPattern([], "UTC").line, NO_PATTERN_LINE);
  assert.equal(failPattern([], "UTC").max, 0);
});

test("fail grid reads weekday and hour in the zone shown", () => {
  const events = [f("2026-10-04T19:00:00Z")];
  assert.equal(failPattern(events, "UTC").grid[6][3], 1, "Sunday 19:00 in UTC");
  assert.equal(failPattern(events, "Asia/Dhaka").grid[0][0], 1, "Monday 01:00 in Dhaka (UTC+6)");
  assert.equal(failPattern(events, "America/New_York").grid[6][2], 1, "Sunday 15:00 in New York is afternoon");
  assert.equal(failPattern(events, "America/New_York").grid[6][3], 0);
});

test("midnight is hour 00 (Night), never hour 24", () => {
  const p = failPattern([f("2026-10-04T00:00:00Z")], "UTC");
  assert.equal(p.grid[6][0], 1);
});
