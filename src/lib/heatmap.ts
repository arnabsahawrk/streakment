import type { ResetEntry } from "./types";

export type DayStatus = "held" | "broken" | "idle" | "future";

export interface DayCell {
  date: Date;
  status: DayStatus;
}

export interface HeatmapGrid {
  /** One column per week, Sunday first, 7 cells each — the standard
   *  GitHub-style contribution-graph layout. */
  weeks: DayCell[][];
  /** Which column index each month's label sits above, in order. */
  monthLabels: { week: number; label: string }[];
  totalWeeks: number;
}

function key(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function eachDay(from: Date, to: Date, fn: (d: Date) => void) {
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  let guard = 0;
  while (cur <= end && guard++ < 4000) {
    fn(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

/** How many trailing weeks to show. Keeps the grid small and scannable
 *  rather than rendering a whole year by default. */
const MAX_WEEKS = 26;

/**
 * Rebuilds a day-by-day record from data already stored - every completed
 * run is bounded by reset_log.run_start..reset_at, and the live run by
 * start_date..today. No per-day rows are kept anywhere.
 *
 * The grid never starts before the streak did - a streak begun in
 * September never renders an empty May - and shows at most the last
 * MAX_WEEKS weeks, GitHub-contribution-graph style: small square cells,
 * one column per week.
 */
export function buildHeatmap(
  streak: { start_date: string | null; created_at: string },
  resets: ResetEntry[],
  today: Date = new Date()
): HeatmapGrid {
  const status = new Map<string, DayStatus>();

  const runs: Array<{ start: Date; end: Date; broke: boolean }> = resets.map((r) => ({
    start: new Date(r.run_start),
    end: new Date(r.reset_at),
    broke: true,
  }));
  if (streak.start_date) {
    runs.push({ start: new Date(streak.start_date), end: today, broke: false });
  }

  for (const run of runs) {
    eachDay(run.start, run.end, (d) => status.set(key(d), "held"));
    // The reset day itself is the break, and overwrites the held marker.
    if (run.broke) status.set(key(run.end), "broken");
  }

  const earliestRun = runs.length
    ? runs.reduce((a, b) => (a.start < b.start ? a : b)).start
    : new Date(streak.created_at);

  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const gridEnd = new Date(todayMid);
  // End the grid on the Saturday of the current week, so every week column
  // is a full 7 days.
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const earliestCap = new Date(earliestRun.getFullYear(), earliestRun.getMonth(), earliestRun.getDate());
  const capByWeeks = new Date(gridEnd);
  capByWeeks.setDate(capByWeeks.getDate() - (MAX_WEEKS * 7 - 1));
  const gridStartDay = earliestCap > capByWeeks ? earliestCap : capByWeeks;
  // Back up to the Sunday on/before the start so the first column is whole.
  const gridStart = new Date(gridStartDay);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const weeks: DayCell[][] = [];
  const monthLabels: { week: number; label: string }[] = [];
  let seenMonth = -1;
  const cursor = new Date(gridStart);
  let weekIndex = 0;

  while (cursor <= gridEnd) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const before = cursor < earliestCap;
      const after = cursor > todayMid;
      const st: DayStatus = before ? "idle" : after ? "future" : (status.get(key(cursor)) ?? "idle");
      week.push({ date: new Date(cursor), status: st });

      if (!before && cursor.getMonth() !== seenMonth) {
        seenMonth = cursor.getMonth();
        monthLabels.push({ week: weekIndex, label: cursor.toLocaleDateString(undefined, { month: "short" }) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    weekIndex++;
  }

  return { weeks, monthLabels, totalWeeks: weeks.length };
}
