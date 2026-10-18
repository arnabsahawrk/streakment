"use client";

import { useDayClock, useDisplay } from "@/lib/clock";
import { viewOf } from "@/lib/progress";
import { send } from "@/lib/request";
import { FOIL_PAINT } from "@/lib/tiers";
import type { Streak } from "@/lib/types";
import { Lock } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { memo, useState } from "react";
import InfiniteMark from "./InfiniteMark";
import { StopDialog } from "./lazy";
import StreakCounter from "./StreakCounter";

/** An Infinite streakment: the simplest card in the app. A name, the count in
 *  the Legend foil, the day it began, and one button: Stop. No why, no
 *  milestones, no emails, no failed, no archive, no rename. Once stopped it
 *  fades, locks, and keeps its final number for good. */
function InfiniteCard({ streak, onSaved }: { streak: Streak; onSaved: (s: Streak) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = useDisplay();

  // A stopped card has nothing left to count, so it needs no day timer.
  const clockNow = useDayClock(streak.stopped_at ? null : streak.start_date);
  const v = viewOf(streak, clockNow);

  async function stop() {
    setBusy(true);
    setErr(null);
    const r = await send<Streak>(`/api/streaks/${streak.id}/stop`, "POST");
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setConfirm(false);
    onSaved(r.data);
  }

  const frame = v.isStopped
    ? { borderColor: "#2E2620" }
    : {
        border: "1px solid transparent",
        backgroundImage: `linear-gradient(#1C1815, #1C1815), ${FOIL_PAINT.css}`,
        backgroundOrigin: "padding-box, border-box",
        backgroundClip: "padding-box, border-box",
      };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-4 pb-3 pt-6 sm:px-6 ${
        v.isStopped ? "border bg-ash-raised" : "sm-foil-border"
      }`}
      style={frame}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${v.isStopped ? "#8A857814" : FOIL_PAINT.glow}, transparent 66%)`,
        }}
      />

      <div className={`relative flex flex-col items-center text-center ${v.isStopped ? "opacity-60" : ""}`}>
        <h3 className="break-words px-4 text-lg font-semibold">{streak.name}</h3>

        <div className="mt-5">
          <InfiniteMark faded={v.isStopped} />
        </div>
        <div className="mt-2">
          <StreakCounter value={v.days} caption={v.caption} paint={FOIL_PAINT} shimmer={v.shimmer} live={!v.isStopped} large />
        </div>

        {v.isStopped && streak.stopped_at && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-paper">
            <Lock size={13} aria-hidden /> Stopped · {d.date(streak.stopped_at)}
          </p>
        )}
      </div>

      {!v.isStopped && (
        <div className="relative flex justify-center">
          <button
            onClick={() => {
              setErr(null);
              setConfirm(true);
            }}
            className="press mt-5 rounded-full border border-ember-line bg-ash px-8 py-2 text-sm font-medium transition-colors hover:border-red-400/50 hover:text-red-400"
          >
            Stop
          </button>
        </div>
      )}

      <div className={`relative mt-4 flex w-full items-center justify-between gap-2 border-t border-ember-line pt-2 pb-1 ${v.isStopped ? "opacity-60" : ""}`}>
        <span className="min-w-0 flex-1 truncate text-left font-mono text-[12px] text-paper-dim">
          Since {streak.start_date ? d.date(streak.start_date) : "—"}
        </span>
        {v.isStopped && <Lock size={15} className="shrink-0 text-paper-dim" aria-label="Locked" />}
      </div>

      {err && !confirm && (
        <p role="alert" className="relative mt-2 text-center text-xs text-red-400">
          {err}
        </p>
      )}

      <AnimatePresence>
        {confirm && (
          <StopDialog key="stop" day={v.days} busy={busy} error={err} onCancel={() => setConfirm(false)} onConfirm={stop} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(InfiniteCard);
