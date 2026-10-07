"use client";

import { useSecond } from "@/lib/clock";
import { DAY_MS, fmtCountdown } from "@/lib/zone";
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

/** The live clock under the title. Display only: nothing here is tappable. */
export function ClockPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5 rounded-2xl border border-ember-line bg-ash-raised px-3.5 py-3"
    >
      <LiveDot />
      <ClockLine className="min-w-0 flex-1 text-[11px] leading-relaxed text-paper-dim" />
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

/** "Paused for 2d 04:11:09" - keeps counting however long a streakment waits. */
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
