import { deviceZone, fmtDay } from "./zone";
import type { Kind } from "./streak";

const ms = (d: string | Date) => new Date(d).getTime();

/** A plain, non-reactive date ("Oct 3, 2026") in this device's zone unless
 *  told otherwise. Components that should follow the live zone use
 *  `useDisplay()` from `@/lib/clock` instead. */
export function formatDate(date: string | Date, tz: string = deviceZone()): string {
  return fmtDay(ms(date), tz);
}

/** 0 and 1 both read as "day"; only 2+ is "days". */
export function dayWord(n: number): string {
  return n <= 1 ? "day" : "days";
}

/** 1,234 with thousands separators, built by hand so every device and
 *  locale prints the same thing. */
export function fmtNum(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** The three layers, in order. Shown as a path in the sidebar, the Add
 *  dialog, the empty state and Stats. */
export const PATH_LABELS = ["Accept Challenge", "Become Legend", "Infinite Streakment"] as const;

/** The name shown for each layer, used everywhere. */
export function typeLabel(kind: Kind): string {
  return kind === "challenge" ? PATH_LABELS[0] : kind === "legend" ? PATH_LABELS[1] : PATH_LABELS[2];
}
