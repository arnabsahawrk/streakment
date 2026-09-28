"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Route, History, Flag, Bell, BellOff } from "lucide-react";
import ProgressRing from "./ProgressRing";
import StreakCounter from "./StreakCounter";
import RoadmapSheet from "./RoadmapSheet";
import HistorySheet from "./HistorySheet";
import { ResetDialog, ArchiveDialog } from "./Dialogs";
import { viewOf, GOLD } from "@/lib/progress";
import { TIERS } from "@/lib/tiers";
import { formatDate, dayWord } from "@/lib/format";
import type { Streak } from "@/lib/types";

export default function StreakCard({
  streak,
  onChange,
}: {
  streak: Streak;
  onChange: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<"reset" | "begin" | "archive" | "mute" | null>(null);
  const [pulse, setPulse] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(streak.email_enabled);

  const v = viewOf(streak);
  const best = Math.max(streak.max_streak, v.days);

  const hitMilestone = useMemo(() => {
    if (v.isPaused || v.days <= 0) return false;
    return v.isChallenge ? v.days === v.goalDays : TIERS.some((t) => t.min === v.days);
  }, [v.isPaused, v.isChallenge, v.days, v.goalDays]);

  useEffect(() => {
    if (!hitMilestone) return;
    confetti({
      particleCount: v.isFinished ? 150 : 90,
      spread: v.isFinished ? 100 : 75,
      origin: { y: 0.6 },
      colors: [v.color, "#F2ECE3"],
    });
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitMilestone]);

  async function call(path: string, body?: unknown, label?: typeof busy) {
    setBusy(label ?? null);
    setErr(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Didn't go through.");
      setResetOpen(false);
      setArchiveOpen(false);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Didn't go through.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleEmail() {
    const next = !emailEnabled;
    setBusy("mute");
    setErr(null);
    try {
      const res = await fetch(`/api/streaks/${streak.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_enabled: next }),
      });
      if (!res.ok) throw new Error();
      setEmailEnabled(next);
    } catch {
      setErr("Couldn't change that.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border bg-ash-raised px-4 pb-5 pt-6 sm:px-6"
      style={{ borderColor: v.isFinished ? `${GOLD}66` : "#2E2620" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 28%, ${v.color}22, transparent 68%)` }}
      />

      <div className="relative flex flex-col items-center text-center">
        <h3 className="break-words text-lg font-semibold">{streak.name}</h3>
        <p className="mt-1 max-w-xs break-words text-center text-xs text-paper-dim">
          {streak.why_note}
        </p>

        <div className="mt-5">
          <ProgressRing progress={v.progress} color={v.color}>
            {v.isPaused ? (
              <div className="px-3 text-center">
                <p className="font-mono text-6xl font-bold leading-none text-paper-dim">—</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-paper-dim">Paused</p>
              </div>
            ) : (
              <StreakCounter value={v.days} label={v.daysLabel} caption={v.caption} color={v.color} />
            )}
          </ProgressRing>
        </div>

        {v.line && <p className="mt-4 max-w-xs text-sm font-bold text-paper">{v.line}</p>}

        <p className="mt-2 text-xs text-paper-dim">
          {v.showsBest && <>Best: {best} {dayWord(best)}</>}
          {!v.isPaused && v.isChallenge && v.goalDays && !v.isFinished && (
            <>{v.goalDays - v.days} {dayWord(v.goalDays - v.days)} to go</>
          )}
          {!v.isPaused && !v.isChallenge && v.upNext && (
            <> · {v.upNext.min - v.days} {dayWord(v.upNext.min - v.days)} to {v.upNext.name}</>
          )}
        </p>

        {v.isFinished ? (
          <button
            onClick={() => setArchiveOpen(true)}
            className="mt-5 rounded-full bg-gold px-7 py-2 text-sm font-semibold text-ash transition-transform active:scale-95"
          >
            Finish and archive
          </button>
        ) : v.isPaused ? (
          <button
            onClick={() => call(`/api/streaks/${streak.id}/start`, undefined, "begin")}
            disabled={busy === "begin"}
            className="mt-5 rounded-full bg-flame px-7 py-2 text-sm font-semibold text-ash transition-transform active:scale-95 disabled:opacity-40"
          >
            {busy === "begin" ? "Lighting…" : "Begin"}
          </button>
        ) : (
          <button
            onClick={() => setResetOpen(true)}
            className="mt-5 rounded-full border border-ember-line bg-ash px-6 py-2 text-sm font-medium transition-colors hover:border-red-400/50 hover:text-red-400"
          >
            Reset
          </button>
        )}

        <div className="mt-5 flex w-full items-center justify-between border-t border-ember-line pt-3">
          <span className="text-[11px] text-paper-dim">
            {v.isPaused ? "Paused" : formatDate(streak.start_date as string)}
          </span>
          <div className="flex items-center gap-3 text-paper-dim">
            <button
              onClick={toggleEmail}
              disabled={busy === "mute"}
              aria-label={emailEnabled ? "Mute notifications for this streakment" : "Unmute notifications for this streakment"}
              className="p-1 hover:text-paper disabled:opacity-40"
            >
              {emailEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <button onClick={() => setRoadmapOpen(true)} aria-label="Open roadmap" className="p-1 hover:text-paper">
              <Route size={16} />
            </button>
            <button onClick={() => setHistoryOpen(true)} aria-label="Open reset history" className="p-1 hover:text-paper">
              <History size={16} />
            </button>
            <button onClick={() => setArchiveOpen(true)} aria-label="Archive" className="p-1 hover:text-paper">
              <Flag size={16} />
            </button>
          </div>
        </div>

        {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
      </div>

      {resetOpen && (
        <ResetDialog
          streak={v.days}
          busy={busy === "reset"}
          onCancel={() => setResetOpen(false)}
          onConfirm={(note) => call(`/api/streaks/${streak.id}/reset`, { note }, "reset")}
        />
      )}
      {archiveOpen && (
        <ArchiveDialog
          name={streak.name}
          busy={busy === "archive"}
          onCancel={() => setArchiveOpen(false)}
          onConfirm={(reason) => call(`/api/streaks/${streak.id}/archive`, { reason }, "archive")}
        />
      )}
      {roadmapOpen && <RoadmapSheet streakId={streak.id} onClose={() => setRoadmapOpen(false)} />}
      {historyOpen && <HistorySheet streakId={streak.id} onClose={() => setHistoryOpen(false)} />}
    </motion.div>
  );
}
