"use client";

import { useHour12, useSecond, useZone } from "@/lib/clock";
import { MONTHS, WEEKDAYS, fmtClock, partsOf, zoneLabel } from "@/lib/zone";

/** "Sat, Oct 3, 2026 · 21:32:47 · Asia/Dhaka" - ticking every second, in
 *  the zone the device is in right now (or the one pinned in Settings).
 *  Before the first tick it holds its place so nothing jumps. */
export function ClockLine({ className = "" }: { className?: string }) {
  const sec = useSecond();
  const tz = useZone();
  const h12 = useHour12();

  if (!sec || !tz) {
    return (
      <p aria-hidden className={`font-mono ${className}`}>
        &nbsp;
      </p>
    );
  }

  const p = partsOf(sec * 1000, tz);
  const dot = <span className="text-paper-dim/40"> · </span>;
  return (
    <p role="timer" aria-live="off" className={`font-mono tabular-nums ${className}`}>
      <span className="whitespace-nowrap">
        {WEEKDAYS[p.wd]}, {MONTHS[p.m - 1]} {p.d}, {p.y}
      </span>
      {dot}
      <span className="whitespace-nowrap font-semibold text-paper">{fmtClock(p, h12, true)}</span>
      {dot}
      <span className="whitespace-nowrap">{zoneLabel(tz)}</span>
    </p>
  );
}
