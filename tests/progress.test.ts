import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS } from "../src/lib/streak";
import { viewOf, resultOf, PAUSED_LINE } from "../src/lib/progress";
import { FOIL_PAINT, NEUTRAL_PAINT, getTier } from "../src/lib/tiers";

const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);
const at = (days: number) => T0 + days * DAY_MS;
const start = new Date(T0);

const challenge = (goal: number, extra = {}) => ({ type: "challenge", goal_days: goal, start_date: start, max_streak: 0, renamed: false, archived: false, ...extra });
const legend = (extra = {}) => ({ type: "legend", goal_days: null, start_date: start, max_streak: 0, renamed: false, archived: false, ...extra });
const infinite = (extra = {}) => ({ type: "infinite", goal_days: null, start_date: start, max_streak: 0, renamed: false, archived: false, ...extra });

test("running challenge: days to go, the colour of its day, can fail", () => {
  const v = viewOf(challenge(21), at(5));
  assert.equal(v.kind, "challenge");
  assert.equal(v.days, 5);
  assert.equal(v.goalDays, 21);
  assert.equal(v.daysToGo, 16);
  assert.equal(v.line, "16 days to go");
  assert.equal(v.caption, "OF 21 DAYS");
  assert.ok(Math.abs(v.progress - 5 / 21) < 1e-9);
  assert.equal(v.color, getTier(5).solid);
  assert.equal(v.badge, null);
  assert.deepEqual(
    [v.canFail, v.canRename, v.canFinish, v.canArchiveInfinite, v.canArchiveEarly, v.canBegin, v.canStop],
    [true, true, false, false, false, false, false],
  );
});

test("running challenge: one day left reads singular", () => {
  assert.equal(viewOf(challenge(1), at(0)).line, "1 day to go");
});

test("completed challenge: the goal, 'Completed' said once, only Finish and Archive", () => {
  const v = viewOf(challenge(21), at(40));
  assert.equal(v.isCompleted, true);
  assert.equal(v.days, 21, "never 22, never 40");
  assert.equal(v.daysLabel, "21");
  assert.equal(v.progress, 1);
  assert.equal(v.line, "", "the badge says it; the line goes quiet");
  assert.equal(v.caption, "OF 21 DAYS");
  assert.equal(v.badge, "Completed");
  assert.equal(v.color, getTier(21).solid, "finishing keeps the colour of its last day");
  assert.deepEqual(
    [v.canFail, v.canRename, v.canFinish, v.canArchiveInfinite, v.canArchiveEarly],
    [false, false, true, false, false],
  );
});

test("a 365-day challenge ends in the Legend foil", () => {
  const v = viewOf(challenge(365), at(365));
  assert.equal(v.isCompleted, true);
  assert.equal(v.paint.foil, true);
  assert.equal(v.paint.css, FOIL_PAINT.css);
});

test("running legend: milestone, next milestone, best and distance", () => {
  const v = viewOf(legend({ max_streak: 40 }), at(10));
  assert.equal(v.kind, "legend");
  assert.equal(v.days, 10);
  assert.equal(v.tier.name, "Control");
  assert.equal(v.upNext?.name, "Discipline");
  assert.equal(v.daysToNext, 5);
  assert.equal(v.line, "Control");
  assert.equal(v.caption, "DAYS");
  assert.equal(v.best, 40);
  assert.equal(v.detail, "Best: 40 days · 5 days to Discipline");
  assert.ok(Math.abs(v.progress - (10 - 7) / (15 - 7)) < 1e-9);
  assert.deepEqual([v.canFail, v.canRename, v.canArchiveEarly, v.canFinish, v.canArchiveInfinite], [true, true, true, false, false]);
});

test("a new legend is Day Zero in grey with Begin up next", () => {
  const v = viewOf(legend(), at(0));
  assert.equal(v.tier.name, "Day Zero");
  assert.equal(v.upNext?.name, "Begin");
  assert.equal(v.daysToNext, 1);
  assert.equal(v.caption, "DAY");
  assert.equal(v.detail, "1 day to Begin", "a best of 0 is left out");
  assert.equal(v.paint.css, NEUTRAL_PAINT.css);
});

test("completed legend: 365, 'Legend' said once, two buttons, stops counting", () => {
  const v = viewOf(legend(), at(500));
  assert.equal(v.isCompleted, true);
  assert.equal(v.days, 365);
  assert.equal(v.daysLabel, "365");
  assert.equal(v.badge, "Legend");
  assert.equal(v.line, "", "the badge says it; the line goes quiet");
  assert.equal(v.upNext, null);
  assert.equal(v.progress, 1);
  assert.equal(v.detail, "", "the best is the 365 already shown");
  assert.equal(v.paint.foil, true);
  assert.deepEqual(
    [v.canFinish, v.canArchiveInfinite, v.canFail, v.canArchiveEarly, v.canRename],
    [true, true, false, false, false],
  );
  assert.equal(viewOf(legend(), at(5000)).days, 365, "never 999+");
});

test("paused legend: dash, PAUSED, Begin, early archive, never miss twice", () => {
  const v = viewOf(legend({ start_date: null, max_streak: 12 }), at(50));
  assert.equal(v.isPaused, true);
  assert.equal(v.days, 0);
  assert.equal(v.daysLabel, "—");
  assert.equal(v.caption, "PAUSED");
  assert.equal(v.line, PAUSED_LINE);
  assert.equal(v.line, "Never miss twice. Begin again.");
  assert.equal(v.paint.css, NEUTRAL_PAINT.css);
  assert.equal(v.detail, "Best: 12 days");
  assert.deepEqual([v.canBegin, v.canFail, v.canArchiveEarly, v.canFinish], [true, false, true, false]);
});

test("live infinite: the count from the real elapsed days, only Stop", () => {
  const v = viewOf(infinite({ start_date: new Date(T0) }), at(369));
  assert.equal(v.kind, "infinite");
  assert.equal(v.days, 369);
  assert.equal(v.daysLabel, "369");
  assert.equal(v.paint.foil, true);
  assert.equal(v.shimmer, true);
  assert.equal(v.badge, null);
  assert.deepEqual(
    [v.canStop, v.canFail, v.canRename, v.canFinish, v.canArchiveInfinite, v.canArchiveEarly, v.canBegin, v.canMute],
    [true, false, false, false, false, false, false, false],
  );
  assert.equal(viewOf(infinite(), at(1234)).daysLabel, "1,234");
  assert.equal(viewOf(infinite(), at(1234567)).daysLabel, "1,234,567");
});

test("stopped infinite: frozen count, faded, no buttons, no shimmer", () => {
  const stopped = infinite({ stopped_at: new Date(at(400)) });
  const v = viewOf(stopped, at(900));
  assert.equal(v.isStopped, true);
  assert.equal(v.days, 400);
  assert.equal(v.badge, "Stopped");
  assert.equal(v.line, "Stopped");
  assert.equal(v.shimmer, false);
  assert.deepEqual(
    [v.canStop, v.canFail, v.canRename, v.canFinish, v.canArchiveInfinite, v.canArchiveEarly, v.canBegin, v.canMute],
    [false, false, false, false, false, false, false, false],
  );
});

test("the pencil: once, never after completion, never on infinite, never archived", () => {
  assert.equal(viewOf(challenge(21), at(2)).canRename, true);
  assert.equal(viewOf(challenge(21, { renamed: true }), at(2)).canRename, false);
  assert.equal(viewOf(challenge(21), at(21)).canRename, false);
  assert.equal(viewOf(legend({ renamed: true }), at(2)).canRename, false);
  assert.equal(viewOf(legend(), at(365)).canRename, false);
  assert.equal(viewOf(legend({ start_date: null }), at(2)).canRename, true, "a paused legend can still be renamed once");
  assert.equal(viewOf(legend({ archived: true, archived_at: new Date(at(30)) }), at(60)).canRename, false);
  assert.equal(viewOf(infinite(), at(400)).canRename, false);
});

test("archive results: capped, plain, and never past the goal or 365", () => {
  assert.equal(resultOf(challenge(21, { archived: true, archived_at: new Date(at(100)) })).text, "Completed: 21 of 21 days");
  const failed = resultOf(challenge(21, { archived: true, archived_at: new Date(at(8)) }));
  assert.equal(failed.text, "Failed: 8 of 21 days");
  assert.equal(failed.tone, "failed");
  assert.equal(resultOf(legend({ archived: true, archived_at: new Date(at(369)) })).text, "Completed: 365 of 365 days");
  assert.equal(resultOf(legend({ archived: true, archived_at: new Date(at(120)) })).text, "Archived at 120 days");
  assert.equal(resultOf(legend({ archived: true, start_date: null, archived_at: new Date(at(120)) })).text, "Archived while paused");
});
