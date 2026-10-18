import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  capOf,
  completionMs,
  currentStreakDays,
  daysOf,
  endOf,
  isCompleted,
  isPaused,
  isStopped,
  kindOf,
  reachedCap,
} from "../src/lib/streak";

const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);
const at = (days: number, extraMs = 0) => T0 + days * DAY_MS + extraMs;
const start = new Date(T0);

const challenge = (goal: number, extra = {}) => ({ type: "challenge", goal_days: goal, start_date: start, ...extra });
const legend = (extra = {}) => ({ type: "legend", goal_days: null, start_date: start, ...extra });
const infinite = (extra = {}) => ({ type: "infinite", goal_days: null, start_date: start, ...extra });

test("kind and cap: goal for a challenge, 365 for a legend, none for infinite", () => {
  assert.equal(kindOf(challenge(21)), "challenge");
  assert.equal(kindOf(legend()), "legend");
  assert.equal(kindOf(infinite()), "infinite");
  assert.equal(capOf(challenge(21)), 21);
  assert.equal(capOf(challenge(365)), 365);
  assert.equal(capOf(legend()), 365);
  assert.equal(capOf(infinite()), null);
});

test("a day is a full 24 hours since the start, never a calendar day", () => {
  assert.equal(currentStreakDays(start, at(0, DAY_MS - 1)), 0);
  assert.equal(currentStreakDays(start, at(1)), 1);
  assert.equal(currentStreakDays(start, at(1, DAY_MS - 1)), 1);
  assert.equal(currentStreakDays(start, at(2)), 2);
  assert.equal(currentStreakDays(null, at(50)), 0);
  assert.equal(currentStreakDays(start, T0 - 5 * DAY_MS), 0, "never negative");
  assert.equal(currentStreakDays("not a date", at(3)), 0);
});

test("a challenge counts to its goal and then stops completely", () => {
  const c = challenge(21);
  assert.equal(daysOf(c, at(20)), 20);
  assert.equal(daysOf(c, at(21)), 21);
  assert.equal(daysOf(c, at(22)), 21, "no 22 days");
  assert.equal(daysOf(c, at(400)), 21, "never counts past the goal");
  assert.equal(isCompleted(c, at(21, -1)), false);
  assert.equal(isCompleted(c, at(21)), true);
  assert.equal(isCompleted(c, at(400)), true);
});

test("a one-day challenge completes after exactly 24 hours", () => {
  const c = challenge(1);
  assert.equal(isCompleted(c, at(0, DAY_MS - 1)), false);
  assert.equal(isCompleted(c, at(1)), true);
});

test("a legend counts to 365 and stops: never 366, never 999+", () => {
  const l = legend();
  assert.equal(daysOf(l, at(364)), 364);
  assert.equal(daysOf(l, at(365)), 365);
  assert.equal(daysOf(l, at(366)), 365);
  assert.equal(daysOf(l, at(5000)), 365);
  assert.equal(isCompleted(l, at(364, DAY_MS - 1)), false);
  assert.equal(isCompleted(l, at(365)), true);
});

test("infinite has no cap and is never 'completed'", () => {
  const i = infinite();
  assert.equal(daysOf(i, at(369)), 369);
  assert.equal(daysOf(i, at(1500)), 1500);
  assert.equal(reachedCap(i, at(1500)), false);
  assert.equal(isCompleted(i, at(1500)), false);
});

test("an infinite made on day 369 of a legend starts at 369, not 365 or 0", () => {
  const now = Date.now();
  const legendStart = new Date(now - 369 * DAY_MS - 5 * 60_000);
  assert.equal(daysOf(infinite({ start_date: legendStart }), now), 369);
});

test("a stopped infinite is frozen at its stop moment for good", () => {
  const stopped = infinite({ stopped_at: new Date(at(400, 1000)) });
  assert.equal(isStopped(stopped), true);
  assert.equal(daysOf(stopped, at(400)), 400);
  assert.equal(daysOf(stopped, at(900)), 400);
  assert.equal(daysOf(stopped, at(99999)), 400);
  assert.equal(endOf(stopped, at(900)), at(400, 1000));
  assert.equal(isStopped(infinite()), false);
});

test("an archived row counts to archived_at and no further", () => {
  const failedChallenge = challenge(21, { archived: true, archived_at: new Date(at(8, 3 * 3_600_000)) });
  assert.equal(daysOf(failedChallenge, at(100)), 8);
  assert.equal(reachedCap(failedChallenge, at(100)), false);
  assert.equal(isCompleted(failedChallenge, at(100)), false);

  const finished = challenge(21, { archived: true, archived_at: new Date(at(30)) });
  assert.equal(daysOf(finished, at(100)), 21, "capped at the goal even if archived late");
  assert.equal(reachedCap(finished, at(100)), true);
  assert.equal(isCompleted(finished, at(100)), false, "archived is no longer 'completed'");

  const convertedLegend = legend({ archived: true, archived_at: new Date(at(369)) });
  assert.equal(daysOf(convertedLegend, at(900)), 365);
  assert.equal(reachedCap(convertedLegend, at(900)), true);

  const earlyLegend = legend({ archived: true, archived_at: new Date(at(120)) });
  assert.equal(daysOf(earlyLegend, at(900)), 120);
  assert.equal(reachedCap(earlyLegend, at(900)), false);
});

test("a paused legend (no start date) is zero, not completed, and paused", () => {
  const p = legend({ start_date: null });
  assert.equal(daysOf(p, at(500)), 0);
  assert.equal(isCompleted(p, at(500)), false);
  assert.equal(reachedCap(p, at(500)), false);
  assert.equal(isPaused(p), true);
  assert.equal(isPaused(legend()), false);
  assert.equal(isPaused(legend({ start_date: null, archived: true })), false);
});

test("completion moment is start plus the cap; none for infinite or paused", () => {
  assert.equal(completionMs(challenge(7)), T0 + 7 * DAY_MS);
  assert.equal(completionMs(legend()), T0 + 365 * DAY_MS);
  assert.equal(completionMs(infinite()), null);
  assert.equal(completionMs(legend({ start_date: null })), null);
});
