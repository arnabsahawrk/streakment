const DAY_MS = 86_400_000;

/** Display caps. The count keeps running until archived, but stops
 *  rendering as an ever-growing number past these. */
export const CHALLENGE_CAP = 365;
export const LEGEND_CAP = 999;

/** Streaks are derived from start_date, never stored as a counter, so
 *  nothing needs a background job just to make the numbers move.
 *  `null` start_date means paused - treated as zero everywhere, which is
 *  also what stops archiving a paused streak from writing a nonsense
 *  max_streak (new Date(null) is the Unix epoch). */
export function currentStreakDays(
  startDate: string | Date | null,
  asOf: string | Date = new Date()
): number {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(asOf).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

/** "365+" / "999+" past the cap, plain number below it. */
export function displayDays(days: number, cap: number): string {
  return days > cap ? `${cap}+` : String(days);
}
