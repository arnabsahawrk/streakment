import { deviceZone, fmtDateTime, fmtDay } from "./zone";

const ms = (d: string | Date) => new Date(d).getTime();

/** Plain, non-reactive date helpers (24-hour, this device's zone unless
 *  told otherwise). Components that should follow the live zone and the
 *  12/24-hour switch use `useDisplay()` from `@/lib/clock` instead. */
export function formatDate(date: string | Date, tz: string = deviceZone()): string {
  return fmtDay(ms(date), tz);
}

export function formatDateTime(date: string | Date, tz: string = deviceZone(), h12 = false): string {
  return fmtDateTime(ms(date), tz, h12);
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
