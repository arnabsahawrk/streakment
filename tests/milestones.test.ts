import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS } from "../src/lib/streak";
import { MILESTONE_DAYS, highestMilestone, pendingEmail } from "../src/lib/milestones";

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const started = (days: number, extraMs = 0) => new Date(NOW - days * DAY_MS - extraMs);

const legend = (days: number | null, extra = {}) => ({
  type: "legend",
  goal_days: null,
  start_date: days === null ? null : started(days),
  archived: false,
  email_enabled: true,
  fail_count: 0,
  ...extra,
});
const challenge = (goal: number, days: number, extra = {}) => ({
  type: "challenge",
  goal_days: goal,
  start_date: started(days),
  archived: false,
  email_enabled: true,
  fail_count: 0,
  ...extra,
});

test("the ten milestone days are unchanged", () => {
  assert.deepEqual([...MILESTONE_DAYS], [1, 3, 7, 15, 21, 30, 60, 90, 180, 365]);
});

test("highest milestone reached", () => {
  assert.equal(highestMilestone(0), null);
  assert.equal(highestMilestone(1)?.name, "Begin");
  assert.equal(highestMilestone(2)?.name, "Begin");
  assert.equal(highestMilestone(3)?.name, "Commit");
  assert.equal(highestMilestone(14)?.name, "Control");
  assert.equal(highestMilestone(15)?.name, "Discipline");
  assert.equal(highestMilestone(364)?.name, "Master");
  assert.equal(highestMilestone(365)?.name, "Legend");
  assert.equal(highestMilestone(5000)?.name, "Legend");
});

test("legend: the milestone reached, 'has reached' not 'is exactly on'", () => {
  assert.equal(pendingEmail(legend(0), NOW), null, "nothing under a day");
  assert.deepEqual(pendingEmail(legend(1), NOW), { kind: "milestone", day: 1, marker: "1" });
  assert.deepEqual(pendingEmail(legend(5), NOW), { kind: "milestone", day: 3, marker: "3" });
  // The cron missed days 7 to 20: it still sends the highest one reached.
  assert.deepEqual(pendingEmail(legend(20), NOW), { kind: "milestone", day: 15, marker: "15" });
  assert.deepEqual(pendingEmail(legend(365), NOW), { kind: "milestone", day: 365, marker: "365" });
});

test("legend: capped at 365, so a completed Legend stays on the Legend email", () => {
  assert.deepEqual(pendingEmail(legend(900), NOW), { kind: "milestone", day: 365, marker: "365" });
});

test("legend that failed and began again gets its milestones again (new marker per run)", () => {
  assert.deepEqual(pendingEmail(legend(7, { fail_count: 2 }), NOW), { kind: "milestone", day: 7, marker: "7-r2" });
  assert.deepEqual(pendingEmail(legend(1, { fail_count: 1 }), NOW), { kind: "milestone", day: 1, marker: "1-r1" });
});

test("challenge: silent until the goal, then one challenge_complete", () => {
  assert.equal(pendingEmail(challenge(21, 20), NOW), null);
  assert.deepEqual(pendingEmail(challenge(21, 21), NOW), { kind: "challenge_complete", day: 21, marker: "21" });
  assert.deepEqual(pendingEmail(challenge(21, 60), NOW), { kind: "challenge_complete", day: 21, marker: "21" }, "a missed day can't lose it");
  assert.equal(pendingEmail(challenge(21, 3), NOW), null, "no milestone emails on a challenge");
});

test("never: infinite, paused, archived, or muted", () => {
  assert.equal(pendingEmail({ type: "infinite", goal_days: null, start_date: started(400), archived: false, email_enabled: false }, NOW), null);
  assert.equal(pendingEmail({ type: "infinite", goal_days: null, start_date: started(400), archived: false, email_enabled: true }, NOW), null, "even if the flag were on");
  assert.equal(pendingEmail(legend(null), NOW), null);
  assert.equal(pendingEmail(legend(40, { archived: true }), NOW), null);
  assert.equal(pendingEmail(challenge(7, 9, { archived: true }), NOW), null);
  assert.equal(pendingEmail(legend(40, { email_enabled: false }), NOW), null);
  assert.equal(pendingEmail(challenge(7, 9, { email_enabled: false }), NOW), null);
});
