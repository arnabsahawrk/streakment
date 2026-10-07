"use client";

import { useState } from "react";
import Modal from "./Modal";
import CharCount from "./CharCount";
import { LIMITS } from "@/lib/limits";
import type { Streak } from "@/lib/types";

export function ResetDialog({
  streak,
  busy,
  onCancel,
  onConfirm,
}: {
  streak: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <Modal title="Reset this streak?" onClose={onCancel}>
      <p className="mb-4 text-sm text-paper-dim">
        Day {streak} ends here.{" "}
        {streak > 0 ? "Best is kept if it's new. " : ""}
        Nothing counts again until I tap Begin.
      </p>
      <label className="mb-1.5 block text-xs text-paper-dim">What happened? (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, LIMITS.resetNote))}
        rows={3}
        placeholder="Only I'll read this. Honesty helps."
        className="w-full resize-none rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={note} max={LIMITS.resetNote} />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} className="press flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Never mind
        </button>
        <button
          onClick={() => onConfirm(note)}
          disabled={busy}
          className="press flex-1 rounded-lg bg-red-500/90 py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
        >
          {busy ? "Resetting…" : "Reset"}
        </button>
      </div>
    </Modal>
  );
}

export function ArchiveDialog({
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const canSubmit = typed.trim() === name && reason.trim().length > 0;

  return (
    <Modal title="Finish and archive?" onClose={onCancel}>
      <p className="mb-4 text-sm text-paper-dim">
        Stops counting and moves to the archive — history and numbers attached.
        Can&apos;t be undone.
      </p>

      <label className="mb-1.5 block text-xs text-paper-dim">Closing note</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, LIMITS.closingNote))}
        rows={3}
        placeholder="How did this end, and what am I taking from it?"
        className="w-full resize-none rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={reason} max={LIMITS.closingNote} />
      </div>

      <label className="mb-1.5 mt-4 block text-xs text-paper-dim">Type the name to confirm</label>
      <p className="mb-2 break-words font-mono text-sm text-paper">{name}</p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type it exactly"
        className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
      />

      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} className="press flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason.trim())}
          disabled={!canSubmit || busy}
          className="press flex-1 rounded-lg bg-gold py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
        >
          {busy ? "Archiving…" : "Archive"}
        </button>
      </div>
    </Modal>
  );
}

export function AddStreakDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: Streak) => void;
}) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [type, setType] = useState<"legend" | "challenge">("legend");
  const [goal, setGoal] = useState("3");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goalNum = Number(goal);
  const goalOk = type === "legend" || (Number.isInteger(goalNum) && goalNum >= 1 && goalNum <= 365);
  const canSubmit = name.trim() && why.trim() && goalOk;

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
          goal_days: type === "challenge" ? goalNum : null,
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

  return (
    <Modal title="New streakment" onClose={onClose}>
      <label className="mb-1.5 block text-xs text-paper-dim">Name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))}
        placeholder="e.g. No phone after 10pm"
        className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end"><CharCount value={name} max={LIMITS.name} /></div>

      <label className="mb-1.5 mt-3 block text-xs text-paper-dim">Why note</label>
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value.slice(0, LIMITS.why))}
        rows={3}
        placeholder="e.g. I keep losing hours to it right before bed, and it wrecks the next morning"
        className="w-full resize-none rounded-lg border border-ember-line bg-ash px-3 py-2.5 focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={why} max={LIMITS.why} />
      </div>

      <label className="mb-2 mt-4 block text-xs text-paper-dim">Type</label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("legend")}
          className={`press rounded-lg border px-3 py-2.5 text-left transition-colors ${
            type === "legend" ? "border-flame bg-flame/10" : "border-ember-line hover:border-paper-dim"
          }`}
        >
          <span className="block text-sm font-semibold">Become Legend</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
            Climbs all the way to Legend.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setType("challenge")}
          className={`press rounded-lg border px-3 py-2.5 text-left transition-colors ${
            type === "challenge" ? "border-flame bg-flame/10" : "border-ember-line hover:border-paper-dim"
          }`}
        >
          <span className="block text-sm font-semibold">Accept Challenge</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
            Ends exactly at the goal.
          </span>
        </button>
      </div>

      {type === "challenge" && (
        <div className="mb-2">
          <div className="mb-2 flex gap-2">
            {[3, 7, 21, 30].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGoal(String(p))}
                className={`press flex-1 rounded-lg border py-2 text-sm transition-colors ${
                  goalNum === p ? "border-flame text-paper" : "border-ember-line text-paper-dim"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            aria-label="Challenge length in days"
            className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
          />
          {!goalOk && <p className="mt-1.5 text-[11px] text-red-400">A whole number, 1 to 365.</p>}
        </div>
      )}

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}

      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="press flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="press flex-1 rounded-lg bg-flame py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
        >
          {busy ? "Lighting…" : "Light it"}
        </button>
      </div>
    </Modal>
  );
}

/** Change a streakment's name or its "why". Nothing else about it moves:
 *  the count, the best and the history all stay exactly as they are. */
export function EditDialog({
  name: initialName,
  why: initialWhy,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  why: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (name: string, why: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [why, setWhy] = useState(initialWhy);
  const changed = name.trim() !== initialName || why.trim() !== initialWhy;
  const canSave = !!name.trim() && !!why.trim() && changed;

  return (
    <Modal title="Edit streakment" onClose={onCancel}>
      <label className="mb-1.5 block text-xs text-paper-dim">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))}
        className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={name} max={LIMITS.name} />
      </div>

      <label className="mb-1.5 mt-3 block text-xs text-paper-dim">Why note</label>
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value.slice(0, LIMITS.why))}
        rows={4}
        className="w-full resize-none rounded-lg border border-ember-line bg-ash px-3 py-2.5 focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={why} max={LIMITS.why} />
      </div>

      <p className="mt-3 text-[11px] text-paper-dim">
        Only the words change. The count, best and history stay exactly as they are.
      </p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="press flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(name.trim(), why.trim())}
          disabled={!canSave || busy}
          className="press flex-1 rounded-lg bg-flame py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
