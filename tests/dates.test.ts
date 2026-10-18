import test from "node:test";
import assert from "node:assert/strict";
import {
  fmtClock,
  fmtCountdown,
  fmtDateTime,
  fmtDay,
  isValidZone,
  partsOf,
  zoneLabel,
} from "../src/lib/zone";
import { PATH_LABELS, dayWord, fmtNum, formatDate, typeLabel } from "../src/lib/format";

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);

test("the clock is always 24-hour, with seconds when asked", () => {
  const ms = utc(2026, 10, 3, 15, 32, 47);
  assert.equal(fmtDateTime(ms, "Asia/Dhaka", true), "Oct 3, 2026, 21:32:47");
  assert.equal(fmtDateTime(ms, "Asia/Dhaka"), "Oct 3, 2026, 21:32");
  assert.equal(fmtClock(partsOf(ms, "Asia/Dhaka"), true), "21:32:47");
  assert.equal(fmtDateTime(utc(2026, 10, 3, 13, 5, 9), "UTC", true), "Oct 3, 2026, 13:05:09", "no PM, no 1:05");
});

test("midnight is 00, never 24", () => {
  assert.equal(partsOf(utc(2026, 10, 4, 0, 0, 0), "UTC").h, 0);
  assert.equal(fmtDateTime(utc(2026, 10, 4, 0, 0, 0), "UTC", true), "Oct 4, 2026, 00:00:00");
  assert.equal(fmtDateTime(utc(2026, 10, 4, 18, 0, 0), "Asia/Dhaka", true), "Oct 5, 2026, 00:00:00");
});

test("the same moment reads differently when the device zone changes", () => {
  const ms = utc(2026, 10, 3, 22, 0, 0);
  assert.equal(fmtDateTime(ms, "UTC"), "Oct 3, 2026, 22:00");
  assert.equal(fmtDateTime(ms, "Asia/Dhaka"), "Oct 4, 2026, 04:00");
  assert.equal(fmtDateTime(ms, "America/New_York"), "Oct 3, 2026, 18:00");
  assert.equal(fmtDateTime(ms, "Pacific/Auckland"), "Oct 4, 2026, 11:00");
});

test("daylight saving shifts are followed (New York, 2026)", () => {
  assert.equal(fmtDateTime(utc(2026, 3, 8, 6, 59, 59), "America/New_York", true), "Mar 8, 2026, 01:59:59");
  assert.equal(fmtDateTime(utc(2026, 3, 8, 7, 0, 0), "America/New_York", true), "Mar 8, 2026, 03:00:00");
  assert.equal(fmtDateTime(utc(2026, 11, 1, 5, 59, 59), "America/New_York", true), "Nov 1, 2026, 01:59:59");
  assert.equal(fmtDateTime(utc(2026, 11, 1, 6, 0, 0), "America/New_York", true), "Nov 1, 2026, 01:00:00");
});

test("the card footer shows the date only", () => {
  const out = formatDate(new Date(utc(2026, 10, 8, 2, 55, 40)).toISOString(), "UTC");
  assert.equal(out, "Oct 8, 2026");
  assert.equal(/\d:\d/.test(out), false, "no time");
  assert.equal(fmtDay(utc(2026, 10, 8, 23, 30), "Asia/Dhaka"), "Oct 9, 2026");
});

test("zone names and validation", () => {
  assert.equal(isValidZone("Asia/Dhaka"), true);
  assert.equal(isValidZone("Not/AZone"), false);
  assert.equal(isValidZone(""), false);
  assert.equal(isValidZone(42), false);
  assert.equal(zoneLabel("Asia/Dhaka"), "Asia/Dhaka");
  assert.equal(zoneLabel("America/Argentina/Buenos_Aires"), "Buenos Aires");
});

test("countdowns", () => {
  assert.equal(fmtCountdown((11 * 3600 + 27 * 60 + 13) * 1000), "11:27:13");
  assert.equal(fmtCountdown((2 * 86400 + 4 * 3600 + 11 * 60 + 9) * 1000), "2d 04:11:09");
  assert.equal(fmtCountdown(0), "00:00:00");
  assert.equal(fmtCountdown(-5000), "00:00:00");
});

test("numbers and words", () => {
  assert.equal(fmtNum(0), "0");
  assert.equal(fmtNum(999), "999");
  assert.equal(fmtNum(1000), "1,000");
  assert.equal(fmtNum(1234567), "1,234,567");
  assert.equal(dayWord(0), "day");
  assert.equal(dayWord(1), "day");
  assert.equal(dayWord(2), "days");
});

test("the three layers are named, in order", () => {
  assert.deepEqual([...PATH_LABELS], ["Accept Challenge", "Become Legend", "Infinite Streakment"]);
  assert.equal(typeLabel("challenge"), "Accept Challenge");
  assert.equal(typeLabel("legend"), "Become Legend");
  assert.equal(typeLabel("infinite"), "Infinite Streakment");
});
