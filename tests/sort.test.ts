import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS } from "../src/lib/streak";
import { SORTS, sortInfinite, sortStreaks } from "../src/lib/sort";

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const daysAgo = (d: number) => new Date(NOW - d * DAY_MS).toISOString();
const made = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString();

const row = (id: string, type: string, goal: number | null, startedDaysAgo: number | null, createdDay: number, extra = {}) => ({
  id,
  type,
  goal_days: goal,
  start_date: startedDaysAgo === null ? null : daysAgo(startedDaysAgo),
  created_at: made(createdDay),
  archived: false,
  ...extra,
});

const set = [
  row("A", "legend", null, 10, 2),
  row("B", "legend", null, 3, 3),
  row("C", "challenge", 7, 9, 4), // completed (goal 7, running 9 days)
  row("D", "legend", null, 400, 5), // completed Legend
  row("E", "legend", null, null, 6), // paused
  row("F", "legend", null, 10, 1), // ties with A on days, created first
];
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).join("");

test("the three orders are named Shortest, Longest, Newest", () => {
  assert.deepEqual(SORTS.map((s) => s.label), ["Shortest", "Longest", "Newest"]);
  assert.deepEqual(SORTS.map((s) => s.key), ["short", "long", "new"]);
});

test("completed cards come first in every order", () => {
  for (const by of ["short", "long", "new"] as const) {
    const out = sortStreaks(set, by, NOW);
    assert.deepEqual(ids(out).slice(0, 2).split("").sort(), ["C", "D"], `${by}: completed first`);
  }
});

test("Shortest: closest to breaking first; ties by creation order", () => {
  assert.equal(ids(sortStreaks(set, "short", NOW)), "CDEBFA");
});

test("Longest: longest first; ties by creation order", () => {
  assert.equal(ids(sortStreaks(set, "long", NOW)), "DCFABE");
});

test("Newest: latest created first", () => {
  assert.equal(ids(sortStreaks(set, "new", NOW)), "DCEBAF");
});

test("sorting never changes the list it was given", () => {
  const copy = JSON.stringify(set);
  sortStreaks(set, "long", NOW);
  assert.equal(JSON.stringify(set), copy);
});

test("the Infinite view: counting first (longest first), stopped after", () => {
  const rows = [
    row("a", "infinite", null, 500, 1, { stopped_at: daysAgo(100) }), // stopped at 400
    row("b", "infinite", null, 380, 2),
    row("c", "infinite", null, 900, 3),
    row("d", "infinite", null, 700, 4, { stopped_at: daysAgo(50) }), // stopped at 650
  ];
  assert.equal(ids(sortInfinite(rows, NOW)), "cbda");
});
