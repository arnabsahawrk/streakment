"use client";

import { buildHeatmap, type DayStatus } from "@/lib/heatmap";
import type { ResetEntry } from "@/lib/types";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function cellStyle(status: DayStatus, color: string) {
  switch (status) {
    case "held":
      return { backgroundColor: `${color}D9`, borderColor: color };
    case "broken":
      return { backgroundColor: "#7F1D1D", borderColor: "#DC2626" };
    case "idle":
      return { backgroundColor: "transparent", borderColor: "#2E2620" };
    default:
      return { backgroundColor: "transparent", borderColor: "transparent" };
  }
}

/** A compact, GitHub-style contribution graph: one small square per day,
 *  one column per week. No hover tooltip - month labels along the top
 *  give the date context instead, so the date is visible at a glance
 *  rather than only on hover. The grid never starts before the streak
 *  did, and every day is reconstructed from run boundaries already in
 *  the database. */
export default function Heatmap({
  streak,
  resets,
  color,
}: {
  streak: { start_date: string | null; created_at: string };
  resets: ResetEntry[];
  color: string;
}) {
  const grid = buildHeatmap(streak, resets);
  const CELL = 11;
  const GAP = 3;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-paper-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border" style={cellStyle("held", color)} /> Kept
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border" style={cellStyle("broken", color)} /> Broke
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border" style={cellStyle("idle", color)} /> Paused
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div style={{ width: grid.totalWeeks * (CELL + GAP) + 24 }}>
          <div className="relative mb-1" style={{ height: 14 }}>
            {grid.monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute text-[9px] text-paper-dim"
                style={{ left: 24 + m.week * (CELL + GAP) }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px]" style={{ width: 20 }}>
              {WEEKDAY_LABELS.map((d, i) => (
                <span
                  key={i}
                  className="text-right text-[8px] leading-none text-paper-dim"
                  style={{ height: CELL, lineHeight: `${CELL}px` }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {grid.weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <span
                      key={di}
                      aria-label={day.status === "future" ? undefined : `${day.date.toDateString()}: ${day.status}`}
                      className="rounded-[2px] border"
                      style={{ width: CELL, height: CELL, ...cellStyle(day.status, color) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
