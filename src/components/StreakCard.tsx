"use client";

import { useDayClock, useDisplay } from "@/lib/clock";
import { viewOf } from "@/lib/progress";
import { send } from "@/lib/request";
import { currentStreakDays } from "@/lib/streak";
import { GOLD, TIERS } from "@/lib/tiers";
import type { ArchiveResult, Streak } from "@/lib/types";
import { Bell, BellOff, Flag, History, Pencil, Route } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import {
  ArchiveEarlyDialog,
  ArchiveInfiniteDialog,
  FailChallengeDialog,
  FailLegendDialog,
  FinishDialog,
  JourneySheet,
  RenameDialog,
  RoadmapSheet,
} from "./lazy";
import { NextDay, PausedFor } from "./LiveClock";
import ProgressRing from "./ProgressRing";
import StreakCounter from "./StreakCounter";

type Busy = "fail" | "begin" | "archive" | "mute" | "rename" | null;
type DialogName = "fail" | "finish" | "infinite" | "early" | "rename" | null;

/** One Accept Challenge or Become Legend card, in every state: running,
 *  paused (Legend), completed (Challenge or Legend). Infinite has its own
 *  card. Everything it shows comes from `viewOf`, so it can't disagree with
 *  the rules the server enforces. */
function StreakCard({
  streak,
  onSaved,
  onArchived,
}: {
  streak: Streak;
  /** The streakment changed; here is its new state. */
  onSaved: (s: Streak) => void;
  /** It left the home screen (archived, or a failed Challenge). */
  onArchived: (r: ArchiveResult) => void;
}) {
  const [dialog, setDialog] = useState<DialogName>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [pulse, setPulse] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = useDisplay();

  // Moves forward exactly when this streakment's day count changes, so the
  // number flips on its own, even on a card left open overnight.
  const clockNow = useDayClock(streak.start_date);
  const v = viewOf(streak, clockNow);
  /** The real days since it began. A completed Legend shows 365 but may be
   *  well past it; "Archive and Infinite" continues from the real number. */
  const realDays = currentStreakDays(streak.start_date, clockNow);

  // Confetti, only when the count goes UP while this card is on screen and
  // lands on a milestone or the goal, or when it becomes completed. Never on
  // page load: what was already true when the card appeared is not news.
  const seen = useRef({ days: v.days, completed: v.isCompleted });
  useEffect(() => {
    const before = seen.current;
    seen.current = { days: v.days, completed: v.isCompleted };
    const onStep = v.kind === "challenge" ? v.days === v.goalDays : TIERS.some((t) => t.min === v.days);
    const justCompleted = v.isCompleted && !before.completed;
    if (!(v.days > before.days && onStep) && !justCompleted) return;

    let cancelled = false;
    // Loaded only at the moment it's needed: most visits never see it.
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: justCompleted ? 150 : 90,
        spread: justCompleted ? 100 : 75,
        origin: { y: 0.6 },
        colors: v.paint.foil ? [GOLD, "#FF8AD0", "#A58BFF", "#5DE2FF", "#F2ECE3"] : [v.color, "#F2ECE3"],
      });
    });
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [v.days, v.isCompleted, v.kind, v.goalDays, v.color, v.paint.foil]);

  function open(name: Exclude<DialogName, null>) {
    setErr(null);
    setDialog(name);
  }

  async function run<T>(label: Exclude<Busy, null>, url: string, method: "POST" | "PATCH", body?: unknown) {
    setBusy(label);
    setErr(null);
    const r = await send<T>(url, method, body);
    setBusy(null);
    if (!r.ok) setErr(r.error);
    return r.ok ? r.data : null;
  }

  async function fail(note: string) {
    const row = await run<Streak>("fail", `/api/streaks/${streak.id}/fail`, "POST", { note });
    if (!row) return;
    setDialog(null);
    // A failed Challenge goes straight to the archive; a Legend waits for Begin.
    if (row.archived) onArchived({ archived: row, infinite: null });
    else onSaved(row);
  }

  async function begin() {
    const row = await run<Streak>("begin", `/api/streaks/${streak.id}/start`, "POST");
    if (row) onSaved(row);
  }

  async function archive(reason: string, infinite: boolean) {
    const data = await run<ArchiveResult>(
      "archive",
      `/api/streaks/${streak.id}/archive`,
      "POST",
      infinite ? { reason, infinite: true } : { reason },
    );
    if (!data) return;
    setDialog(null);
    onArchived(data);
  }

  async function rename(name: string, why: string) {
    const row = await run<Streak>("rename", `/api/streaks/${streak.id}`, "PATCH", { name, why_note: why });
    if (!row) return;
    setDialog(null);
    onSaved(row);
  }

  async function toggleEmail() {
    const next = !streak.email_enabled;
    onSaved({ ...streak, email_enabled: next }); // instant; undone below if it fails
    setBusy("mute");
    setErr(null);
    const r = await send<Streak>(`/api/streaks/${streak.id}`, "PATCH", { email_enabled: next });
    setBusy(null);
    if (!r.ok) {
      onSaved({ ...streak, email_enabled: !next });
      setErr("Couldn't change that.");
    }
  }

  const liveLine = "mt-1.5 font-mono text-[11px] tabular-nums text-paper-dim/80";
  const mainButton = "press mt-5 rounded-full px-7 py-2 text-sm font-semibold text-ash disabled:opacity-40";
  const iconButton =
    "press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-paper-dim hover:text-paper disabled:opacity-40 min-[380px]:h-10 min-[380px]:w-10";

  // A completed card gets a hairline border in its own gradient (the foil
  // drifts slowly); a running one a soft tint of its colour.
  const frame = v.isCompleted
    ? {
        border: "1px solid transparent",
        backgroundImage: `linear-gradient(#1C1815, #1C1815), ${v.paint.css}`,
        backgroundOrigin: "padding-box, border-box",
        backgroundClip: "padding-box, border-box",
      }
    : { borderColor: v.days > 0 ? `${v.paint.solid}40` : "#2E2620" };

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl px-4 pb-3 pt-6 sm:px-6 ${
        v.isCompleted ? (v.paint.foil ? "sm-foil-border" : "") : "border bg-ash-raised"
      }`}
      style={frame}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 28%, ${v.paint.glow}, transparent 68%)` }}
      />

      {v.canRename && (
        <button
          onClick={() => open("rename")}
          aria-label="Rename (one time)"
          className="press absolute right-1 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full text-paper-dim/60 hover:text-paper"
        >
          <Pencil size={14} />
        </button>
      )}

      <div className="relative flex flex-col items-center text-center">
        <h3 className="break-words px-7 text-lg font-semibold">{streak.name}</h3>
        <p className="mt-1 max-w-xs break-words text-center text-xs text-paper-dim">{streak.why_note}</p>

        <div className="mt-5">
          <ProgressRing progress={v.progress} paint={v.paint}>
            {v.isPaused ? (
              <div className="px-3 text-center">
                <p className="font-mono text-6xl font-bold leading-none text-paper-dim">—</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-paper-dim">{v.caption}</p>
              </div>
            ) : (
              <StreakCounter value={v.days} caption={v.caption} paint={v.paint} live={!v.isCompleted} shimmer={v.paint.foil} />
            )}
          </ProgressRing>
        </div>

        {v.badge && (
          <span
            className="mt-3 inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold"
            style={{ color: v.color, borderColor: `${v.color}66`, background: v.paint.glow }}
          >
            {v.badge}
          </span>
        )}

        {v.line && <p className="mt-3 max-w-xs text-sm font-bold text-paper">{v.line}</p>}
        {v.detail && <p className="mt-1.5 max-w-xs text-xs text-paper-dim">{v.detail}</p>}

        {!v.isPaused && !v.isCompleted && streak.start_date && (
          <p className={liveLine}>
            <NextDay start={streak.start_date} />
          </p>
        )}
        {v.isPaused && streak.paused_at && (
          <p className={liveLine}>
            <PausedFor since={streak.paused_at} />
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-2">
          {v.canBegin && (
            <button onClick={begin} disabled={busy === "begin"} className={`${mainButton} bg-flame`}>
              {busy === "begin" ? "Starting…" : "Begin"}
            </button>
          )}
          {v.canFail && (
            <button
              onClick={() => open("fail")}
              className="press mt-5 rounded-full border border-ember-line bg-ash px-6 py-2 text-sm font-medium transition-colors hover:border-red-400/50 hover:text-red-400"
            >
              Failed
            </button>
          )}
          {v.canFinish && (
            <button onClick={() => open("finish")} className={`${mainButton} bg-gold`}>
              Finish and Archive
            </button>
          )}
          {v.canArchiveInfinite && (
            <button
              onClick={() => open("infinite")}
              className="press mt-5 rounded-full border px-6 py-2 text-sm font-semibold text-paper"
              style={{ borderColor: `${GOLD}99`, background: "#FFC2331A" }}
            >
              Archive and Infinite
            </button>
          )}
        </div>

        {/* Footer: one row, never wrapping, the same on every device. */}
        <div className="mt-4 flex w-full items-center justify-between gap-2 border-t border-ember-line pt-1.5">
          <span className="min-w-0 flex-1 truncate text-left font-mono text-[12px] text-paper-dim">
            {v.isPaused || !streak.start_date ? "Paused" : d.date(streak.start_date)}
          </span>
          <div className="flex shrink-0 items-center">
            {v.canMute && (
              <button
                onClick={toggleEmail}
                disabled={busy === "mute"}
                aria-label={streak.email_enabled ? "Mute emails for this streakment" : "Unmute emails for this streakment"}
                className={iconButton}
              >
                {streak.email_enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </button>
            )}
            <button onClick={() => setRoadmapOpen(true)} aria-label="Open roadmap" className={iconButton}>
              <Route size={18} />
            </button>
            <button onClick={() => setJourneyOpen(true)} aria-label="Open journey" className={iconButton}>
              <History size={18} />
            </button>
            {v.canArchiveEarly && (
              <button onClick={() => open("early")} aria-label="Archive early" className={iconButton}>
                <Flag size={18} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {err && !dialog && (
            <motion.p
              key="err"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-xs text-red-400"
            >
              {err}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dialog === "fail" &&
          (v.kind === "challenge" ? (
            <FailChallengeDialog
              key="fail"
              busy={busy === "fail"}
              error={err}
              onCancel={() => setDialog(null)}
              onConfirm={fail}
            />
          ) : (
            <FailLegendDialog
              key="fail"
              day={v.days}
              busy={busy === "fail"}
              error={err}
              onCancel={() => setDialog(null)}
              onConfirm={fail}
            />
          ))}
        {dialog === "finish" && (
          <FinishDialog
            key="finish"
            name={streak.name}
            busy={busy === "archive"}
            error={err}
            onCancel={() => setDialog(null)}
            onConfirm={(reason) => archive(reason, false)}
          />
        )}
        {dialog === "infinite" && (
          <ArchiveInfiniteDialog
            key="infinite"
            name={streak.name}
            day={realDays}
            busy={busy === "archive"}
            error={err}
            onCancel={() => setDialog(null)}
            onConfirm={(reason) => archive(reason, true)}
          />
        )}
        {dialog === "early" && (
          <ArchiveEarlyDialog
            key="early"
            busy={busy === "archive"}
            error={err}
            onCancel={() => setDialog(null)}
            onConfirm={(reason) => archive(reason, false)}
          />
        )}
        {dialog === "rename" && (
          <RenameDialog
            key="rename"
            name={streak.name}
            why={streak.why_note}
            busy={busy === "rename"}
            error={err}
            onCancel={() => setDialog(null)}
            onConfirm={rename}
          />
        )}
        {roadmapOpen && <RoadmapSheet key="roadmap" streakId={streak.id} onClose={() => setRoadmapOpen(false)} />}
        {journeyOpen && <JourneySheet key="journey" streakId={streak.id} onClose={() => setJourneyOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(StreakCard);
