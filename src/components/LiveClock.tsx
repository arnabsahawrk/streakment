"use client";

import { useSecond } from "@/lib/clock";
import { nextMilestone } from "@/lib/progress";
import type { Streak } from "@/lib/types";
import { DAY_MS, fmtCountdown } from "@/lib/zone";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { ClockLine } from "./ClockLine";

function LiveDot() {
  return (
    <span aria-hidden className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-flame" />
    </span>
  );
}

/** The soonest thing about to happen, counting down live. */
function NextUp({ streaks }: { streaks: Streak[] | null }) {
  const sec = useSecond();
  if (!sec || !streaks) return null;
  const up = nextMilestone(streaks, sec * 1000);
  if (!up) return null;

  return (
    <motion.div
      key={up.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between gap-3 border-t border-ember-line px-3.5 py-2.5"
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-paper-dim">Next up</p>
        <p className="mt-0.5 truncate text-xs">
          <span className="text-paper">{up.name}</span>
          <span className="text-paper-dim"> → </span>
          <span style={{ color: up.color }}>{up.label}</span>
        </p>
      </div>
      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums" style={{ color: up.color }}>
        {fmtCountdown(up.at - sec * 1000)}
      </p>
    </motion.div>
  );
}

/** The panel under the title: a live clock, and - once something is
 *  running - a countdown to whatever arrives next. Tapping the clock
 *  opens the time settings. */
export function NowPanel({
  streaks,
  onOpenTime,
}: {
  streaks: Streak[] | null;
  onOpenTime: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-ember-line bg-ash-raised"
    >
      <button
        onClick={onOpenTime}
        aria-label="Time settings"
        className="press flex w-full items-center gap-2 px-3 py-3 text-left"
      >
        <LiveDot />
        <ClockLine className="min-w-0 flex-1 text-[11px] leading-relaxed text-paper-dim" />
        <ChevronRight size={12} aria-hidden className="shrink-0 text-paper-dim/60" />
      </button>
      <NextUp streaks={streaks} />
    </motion.div>
  );
}

/** "Next day in 11:27:13" - drops into a card's text line. */
export function NextDay({ start }: { start: string }) {
  const sec = useSecond();
  const startMs = Date.parse(start);
  if (!sec || Number.isNaN(startMs)) return <>Next day in --:--:--</>;
  const into = (((sec * 1000 - startMs) % DAY_MS) + DAY_MS) % DAY_MS;
  // Held just under 24:00:00 so the instant a day flips it never flashes "1d".
  return (
    <>
      Next day in <span className="text-paper">{fmtCountdown(Math.min(DAY_MS - into, DAY_MS - 1000))}</span>
    </>
  );
}

/** "Paused for 2d 04:11:09" - counts up while a streakment waits. */
export function PausedFor({ since }: { since: string }) {
  const sec = useSecond();
  const ms = Date.parse(since);
  if (!sec || Number.isNaN(ms)) return null;
  return (
    <>
      Paused for <span className="text-paper">{fmtCountdown(sec * 1000 - ms)}</span>
    </>
  );
}
