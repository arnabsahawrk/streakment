"use client";

import { LIMITS } from "@/lib/limits";
import { CHALLENGE_PRESETS, MAX_GOAL_DAYS } from "@/lib/progress";
import type { Streak } from "@/lib/types";
import { useState } from "react";
import CharCount from "./CharCount";
import { Buttons, ErrorLine, FIELD, LABEL } from "./DialogParts";
import Modal from "./Modal";
import PathStrip from "./PathStrip";

/** Start a streakment: Accept Challenge (the default, because the path starts
 *  small) or Become Legend. Infinite is never started here. */
export function AddStreakDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: Streak) => void;
}) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [type, setType] = useState<"challenge" | "legend">("challenge");
  const [goal, setGoal] = useState("7");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goalNum = Number(goal);
  const goalOk = type === "legend" || (goal.trim() !== "" && Number.isInteger(goalNum) && goalNum >= 1 && goalNum <= MAX_GOAL_DAYS);
  const canSubmit = !!name.trim() && !!why.trim() && goalOk;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/streaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          why_note: why.trim(),
          type,
          goal_days: type === "challenge" ? goalNum : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't save that.");
      onCreated(data as Streak);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  const pick = (key: "challenge" | "legend", title: string, line: string) => (
    <button
      type="button"
      aria-pressed={type === key}
      onClick={() => setType(key)}
      className={`press rounded-lg border px-3 py-2.5 text-left transition-colors ${
        type === key ? "border-flame bg-flame/10" : "border-ember-line hover:border-paper-dim"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">{line}</span>
    </button>
  );

  return (
    <Modal title="New streakment" onClose={onClose}>
      <label className={LABEL}>Name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))}
        placeholder="No mindless scrolling"
        className={FIELD}
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={name} max={LIMITS.name} />
      </div>

      <label className={`${LABEL} mt-3`}>Why</label>
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value.slice(0, LIMITS.why))}
        rows={3}
        placeholder="The regret I'm avoiding. Be honest."
        className={`${FIELD} resize-none`}
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={why} max={LIMITS.why} />
      </div>

      <label className={`${LABEL} mt-4`}>Start as</label>
      <div className="grid grid-cols-2 gap-2">
        {pick("challenge", "Accept Challenge", "Small and fixed. Do or die.")}
        {pick("legend", "Become Legend", "365 days. Failed sends it back to the start.")}
      </div>
      <PathStrip active={type} className="mt-3 text-[11px] text-paper-dim" />

      {type === "challenge" && (
        <div className="mt-4">
          <label className={LABEL}>Length in days</label>
          <div className="mb-2 flex gap-2">
            {CHALLENGE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={goalNum === p}
                onClick={() => setGoal(String(p))}
                className={`press flex-1 rounded-lg border py-2 text-sm transition-colors ${
                  goalNum === p ? "border-flame text-paper" : "border-ember-line text-paper-dim"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_GOAL_DAYS}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            aria-label="Challenge length in days"
            className={FIELD}
          />
          {!goalOk && <p className="mt-1.5 text-[11px] text-red-400">A whole number, 1 to {MAX_GOAL_DAYS}.</p>}
        </div>
      )}

      <ErrorLine text={err} />
      <Buttons onCancel={onClose} onConfirm={submit} confirm="Start" working="Starting…" busy={busy} disabled={!canSubmit} tone="flame" />
    </Modal>
  );
}
