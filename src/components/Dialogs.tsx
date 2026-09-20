"use client";

import { useState } from "react";
import Modal from "./Modal";
import CharCount from "./CharCount";
import { LIMITS } from "@/lib/limits";

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
        {streak > 0 ? "It's kept as your best if it's a new one. " : ""}
        Nothing counts again until you tap Begin — whenever that is.
      </p>
      <label className="mb-1.5 block text-xs text-paper-dim">What happened? (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, LIMITS.resetNote))}
        rows={3}
        placeholder="Only you will read this. Being honest here helps."
        className="w-full resize-none rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={note} max={LIMITS.resetNote} />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Never mind
        </button>
        <button
          onClick={() => onConfirm(note)}
          disabled={busy}
          className="flex-1 rounded-lg bg-red-500/90 py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
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
        It stops counting and moves into your archive with everything attached —
        the history, the numbers. This can&apos;t be undone.
      </p>

      <label className="mb-1.5 block text-xs text-paper-dim">Closing note</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, LIMITS.closingNote))}
        rows={3}
        placeholder="How did this end, and what are you taking from it?"
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
        <button onClick={onCancel} className="flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason.trim())}
          disabled={!canSubmit || busy}
          className="flex-1 rounded-lg bg-gold py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
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
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [kind, setKind] = useState<"ascent" | "sprint">("ascent");
  const [goal, setGoal] = useState("3");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goalNum = Number(goal);
  const goalOk = kind === "ascent" || (Number.isInteger(goalNum) && goalNum >= 1 && goalNum <= 365);
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
          kind,
          goal_days: kind === "sprint" ? goalNum : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't save that.");
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New streakment" onClose={onClose}>
      <label className="mb-1.5 block text-xs text-paper-dim">What are you committing to</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))}
        placeholder="e.g. No phone after 10pm"
        className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 focus:border-flame focus:outline-none"
      />
      <div className="mt-1 flex justify-end"><CharCount value={name} max={LIMITS.name} /></div>

      <label className="mb-1.5 mt-3 block text-xs text-paper-dim">Why</label>
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

      <label className="mb-2 mt-4 block text-xs text-paper-dim">How are you holding it</label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setKind("ascent")}
          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
            kind === "ascent" ? "border-flame bg-flame/10" : "border-ember-line hover:border-paper-dim"
          }`}
        >
          <span className="block text-sm font-semibold">Climb</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
            No finish line. Climb to Legend.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setKind("sprint")}
          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
            kind === "sprint" ? "border-flame bg-flame/10" : "border-ember-line hover:border-paper-dim"
          }`}
        >
          <span className="block text-sm font-semibold">Challenge</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
            Fixed length. Done when you arrive.
          </span>
        </button>
      </div>

      {kind === "sprint" && (
        <div className="mb-2">
          <div className="mb-2 flex gap-2">
            {[3, 7, 21, 30].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGoal(String(p))}
                className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
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
          {!goalOk && <p className="mt-1.5 text-[11px] text-red-400">A whole number between 1 and 365.</p>}
        </div>
      )}

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}

      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="flex-1 rounded-lg bg-flame py-2.5 text-sm font-semibold text-ash disabled:opacity-40"
        >
          {busy ? "Lighting…" : "Light it"}
        </button>
      </div>
    </Modal>
  );
}
