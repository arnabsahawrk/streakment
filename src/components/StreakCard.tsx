"use client";

import { now, useDayClock, useDisplay } from "@/lib/clock";
import { dayWord } from "@/lib/format";
import { GOLD, viewOf } from "@/lib/progress";
import { TIERS } from "@/lib/tiers";
import type { Streak } from "@/lib/types";
import { Bell, BellOff, Flag, History, Pencil, Route } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { memo, useEffect, useMemo, useState } from "react";
import { ArchiveDialog, EditDialog, ResetDialog } from "./Dialogs";
import { NextDay, PausedFor } from "./LiveClock";
import ProgressRing from "./ProgressRing";
import StreakCounter from "./StreakCounter";

// Opened rarely, so they load on demand instead of weighing down every visit.
const HistorySheet = dynamic(() => import("./HistorySheet"), { ssr: false });
const RoadmapSheet = dynamic(() => import("./RoadmapSheet"), { ssr: false });

type Busy = "reset" | "begin" | "archive" | "mute" | "edit" | null;

function StreakCard({
  streak,
  onSaved,
  onArchived,
}: {
  streak: Streak;
  /** The streak changed; here is its new state. */
  onSaved: (s: Streak) => void;
  onArchived: (id: string) => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [pulse, setPulse] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = useDisplay();

  // Moves forward exactly when this streakment's day count changes, so the
  // number flips on its own - even on a card left open overnight.
  const clockNow = useDayClock(streak.start_date);
  const v = viewOf(streak, clockNow);
  const best = Math.max(streak.max_streak, v.days);

  const hitMilestone = useMemo(() => {
    if (v.isPaused || v.days <= 0) return false;
    return v.isChallenge ? v.days === v.goalDays : TIERS.some((t) => t.min === v.days);
  }, [v.isPaused, v.isChallenge, v.days, v.goalDays]);

  useEffect(() => {
    if (!hitMilestone) return;
    let cancelled = false;
    // Loaded only at the moment it's needed: most visits never see it.
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: v.isFinished ? 150 : 90,
        spread: v.isFinished ? 100 : 75,
        origin: { y: 0.6 },
        colors: [v.color, "#F2ECE3"],
      });
    });
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitMilestone]);

  async function send(url: string, method: "POST" | "PATCH", body: unknown, label: Exclude<Busy, null>) {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Didn't go through.");
      return data as Streak;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Didn't go through.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function reset(note: string) {
    const row = await send(`/api/streaks/${streak.id}/reset`, "POST", { note }, "reset");
    if (!row) return;
    setResetOpen(false);
    // The server stamped the pause time; use it, so what's shown now is
    // exactly what will be shown after a reload.
    onSaved({ ...row, paused_at: row.paused_at ?? new Date(now()).toISOString() });
  }

  async function begin() {
    const row = await send(`/api/streaks/${streak.id}/start`, "POST", undefined, "begin");
    if (row) onSaved({ ...row, paused_at: null });
  }

  async function archive(reason: string) {
    const row = await send(`/api/streaks/${streak.id}/archive`, "POST", { reason }, "archive");
    if (!row) return;
    setArchiveOpen(false);
    onArchived(streak.id);
  }

  async function edit(name: string, why: string) {
    const row = await send(`/api/streaks/${streak.id}`, "PATCH", { name, why_note: why }, "edit");
    if (!row) return;
    setEditOpen(false);
    onSaved({ ...streak, ...row, paused_at: row.paused_at ?? streak.paused_at });
  }

  async function toggleEmail() {
    const next = !streak.email_enabled;
    onSaved({ ...streak, email_enabled: next }); // instant; undone below if it fails
    setBusy("mute");
    setErr(null);
    try {
      const res = await fetch(`/api/streaks/${streak.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_enabled: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onSaved({ ...streak, email_enabled: !next });
      setErr("Couldn't change that.");
    } finally {
      setBusy(null);
    }
  }

  const liveLine = "mt-1.5 font-mono text-[11px] tabular-nums text-paper-dim/80";

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

      <button
        onClick={() => setEditOpen(true)}
        aria-label="Edit name and why"
        className="press absolute right-2 top-2 z-10 rounded-full p-2.5 text-paper-dim/60 hover:text-paper"
      >
        <Pencil size={14} />
      </button>

      <div className="relative flex flex-col items-center text-center">
        <h3 className="break-words px-7 text-lg font-semibold">{streak.name}</h3>
        <p className="mt-1 max-w-xs break-words text-center text-xs text-paper-dim">{streak.why_note}</p>

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
          {v.showsBest && (
            <>
              Best: {best} {dayWord(best)}
            </>
          )}
          {!v.isPaused && v.isChallenge && v.goalDays && !v.isFinished && (
            <>
              {v.goalDays - v.days} {dayWord(v.goalDays - v.days)} to go
            </>
          )}
          {!v.isPaused && !v.isChallenge && v.upNext && (
            <>
              {" "}
              · {v.upNext.min - v.days} {dayWord(v.upNext.min - v.days)} to {v.upNext.name}
            </>
          )}
        </p>

        {!v.isPaused && !v.isFinished && streak.start_date && (
          <p className={liveLine}>
            <NextDay start={streak.start_date} />
          </p>
        )}
        {v.isPaused && streak.paused_at && (
          <p className={liveLine}>
            <PausedFor since={streak.paused_at} />
          </p>
        )}

        {v.isFinished ? (
          <button
            onClick={() => setArchiveOpen(true)}
            className="press mt-5 rounded-full bg-gold px-7 py-2 text-sm font-semibold text-ash"
          >
            Finish and archive
          </button>
        ) : v.isPaused ? (
          <button
            onClick={begin}
            disabled={busy === "begin"}
            className="press mt-5 rounded-full bg-flame px-7 py-2 text-sm font-semibold text-ash disabled:opacity-40"
          >
            {busy === "begin" ? "Lighting…" : "Begin"}
          </button>
        ) : (
          <button
            onClick={() => setResetOpen(true)}
            className="press mt-5 rounded-full border border-ember-line bg-ash px-6 py-2 text-sm font-medium transition-colors hover:border-red-400/50 hover:text-red-400"
          >
            Reset
          </button>
        )}

        <div className="mt-5 flex w-full items-center justify-between gap-2 border-t border-ember-line pt-3">
          <span className="min-w-0 truncate text-[10px] text-paper-dim sm:text-[11px]">
            {v.isPaused ? "Paused" : d.dateTime(streak.start_date as string, true)}
          </span>
          <div className="flex shrink-0 items-center gap-2 text-paper-dim sm:gap-3">
            <button
              onClick={toggleEmail}
              disabled={busy === "mute"}
              aria-label={
                streak.email_enabled
                  ? "Mute notifications for this streakment"
                  : "Unmute notifications for this streakment"
              }
              className="press p-1 hover:text-paper disabled:opacity-40"
            >
              {streak.email_enabled ? (
                <Bell className="size-[15px] sm:size-4" />
              ) : (
                <BellOff className="size-[15px] sm:size-4" />
              )}
            </button>
            <button
              onClick={() => setRoadmapOpen(true)}
              aria-label="Open roadmap"
              className="press p-1 hover:text-paper"
            >
              <Route className="size-[15px] sm:size-4" />
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label="Open reset history"
              className="press p-1 hover:text-paper"
            >
              <History className="size-[15px] sm:size-4" />
            </button>
            <button onClick={() => setArchiveOpen(true)} aria-label="Archive" className="press p-1 hover:text-paper">
              <Flag className="size-[15px] sm:size-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs text-red-400"
            >
              {err}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {resetOpen && (
          <ResetDialog
            key="reset"
            streak={v.days}
            busy={busy === "reset"}
            onCancel={() => setResetOpen(false)}
            onConfirm={reset}
          />
        )}
        {archiveOpen && (
          <ArchiveDialog
            key="archive"
            name={streak.name}
            busy={busy === "archive"}
            onCancel={() => setArchiveOpen(false)}
            onConfirm={archive}
          />
        )}
        {editOpen && (
          <EditDialog
            key="edit"
            name={streak.name}
            why={streak.why_note}
            busy={busy === "edit"}
            error={err}
            onCancel={() => setEditOpen(false)}
            onConfirm={edit}
          />
        )}
        {roadmapOpen && <RoadmapSheet key="roadmap" streakId={streak.id} onClose={() => setRoadmapOpen(false)} />}
        {historyOpen && <HistorySheet key="history" streakId={streak.id} onClose={() => setHistoryOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(StreakCard);
