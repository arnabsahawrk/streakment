import { deviceZone, fmtDay } from "./zone";

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

/** The name shown for each streak shape, used everywhere: the type
 *  picker, badges, and status lines. */
export function typeLabel(isChallenge: boolean): string {
  return isChallenge ? "Accept Challenge" : "Become Legend";
}
