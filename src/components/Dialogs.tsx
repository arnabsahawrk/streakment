"use client";

import { LIMITS } from "@/lib/limits";
import { useState } from "react";
import CharCount from "./CharCount";
import { Buttons, ErrorLine, FIELD, LABEL, Lead, NameConfirm, Note } from "./DialogParts";
import Modal from "./Modal";

/** The dialogs a card opens: Failed, Finish and Archive, Archive and Infinite,
 *  Archive early, Stop, and the one Rename. They load only when first needed
 *  (the dashboard warms them a moment after it settles), so the page you land
 *  on stays light. Each hands its answer back to the card that opened it. */

/** Failed on a Legend: it goes back to the beginning and waits for Begin. */
export function FailLegendDialog({
  day,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  day: number;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal title="Mark as failed?" onClose={onCancel}>
      <Lead>
        {day >= 1 ? `Day ${day} ends here. ` : "It hasn't reached a full day, so this won't count as a fail. "}
        It goes back to the beginning and waits, paused, until I tap Begin. Never miss twice.
      </Lead>
      <Note label="What happened? (optional)" value={note} onChange={setNote} max={LIMITS.failNote} placeholder="Only I read this. Be honest." />
      <ErrorLine text={error} />
      <Buttons onCancel={onCancel} onConfirm={() => onConfirm(note.trim())} confirm="Failed" working="Saving…" busy={busy} tone="danger" />
    </Modal>
  );
}

/** Failed on a Challenge: do or die. It ends and goes to the archive. */
export function FailChallengeDialog({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal title="Mark as failed?" onClose={onCancel}>
      <Lead>Do or die. This challenge ends here and moves to the archive. It can&apos;t be restarted.</Lead>
      <Note label="Closing note" value={note} onChange={setNote} max={LIMITS.closingNote} placeholder="What happened? Be honest." />
      <ErrorLine text={error} />
      <Buttons
        onCancel={onCancel}
        onConfirm={() => onConfirm(note.trim())}
        confirm="Failed"
        working="Saving…"
        busy={busy}
        disabled={!note.trim()}
        tone="danger"
      />
    </Modal>
  );
}

/** Finish and Archive: a completed Challenge or Legend. */
export function FinishDialog({
  name,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Modal title="Finish and Archive?" onClose={onCancel}>
      <Lead>It moves to the archive with its history. This can&apos;t be undone.</Lead>
      <Note label="Closing note" value={reason} onChange={setReason} max={LIMITS.closingNote} placeholder="How did it end? What do I keep from it?" />
      <NameConfirm name={name} typed={typed} onChange={setTyped} />
      <ErrorLine text={error} />
      <Buttons
        onCancel={onCancel}
        onConfirm={() => onConfirm(reason.trim())}
        confirm="Finish and Archive"
        working="Archiving…"
        busy={busy}
        disabled={typed.trim() !== name || !reason.trim()}
        tone="gold"
      />
    </Modal>
  );
}

/** Archive and Infinite: a completed Legend only. */
export function ArchiveInfiniteDialog({
  name,
  day,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  /** The real number of days since it began (it can be more than 365). */
  day: number;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Modal title="Archive and Infinite?" onClose={onCancel}>
      <Lead>
        The Legend moves to the archive. A new Infinite card keeps counting from day {day}. It has no failed, no emails,
        no notes. You can only stop it, for good.
      </Lead>
      <Note label="Closing note" value={reason} onChange={setReason} max={LIMITS.closingNote} placeholder="What did this Legend give me?" />
      <NameConfirm name={name} typed={typed} onChange={setTyped} />
      <ErrorLine text={error} />
      <Buttons
        onCancel={onCancel}
        onConfirm={() => onConfirm(reason.trim())}
        confirm="Archive and Infinite"
        working="Archiving…"
        busy={busy}
        disabled={typed.trim() !== name || !reason.trim()}
        tone="gold"
      />
    </Modal>
  );
}

/** Archive early: a Legend that has not reached 365. */
export function ArchiveEarlyDialog({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Archive early?" onClose={onCancel}>
      <Lead>This ends it before 365 days. It moves to the archive as not completed.</Lead>
      <Note label="Closing note" value={reason} onChange={setReason} max={LIMITS.closingNote} placeholder="Why am I ending it? Be honest." />
      <ErrorLine text={error} />
      <Buttons
        onCancel={onCancel}
        onConfirm={() => onConfirm(reason.trim())}
        confirm="Archive"
        working="Archiving…"
        busy={busy}
        disabled={!reason.trim()}
        tone="danger"
      />
    </Modal>
  );
}

/** Stop an Infinite streakment. For good. */
export function StopDialog({
  day,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  day: number;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Stop it for good?" onClose={onCancel}>
      <Lead>The count freezes at day {day} and the card locks. It can&apos;t be restarted.</Lead>
      <ErrorLine text={error} />
      <Buttons onCancel={onCancel} onConfirm={onConfirm} confirm="Stop" working="Stopping…" busy={busy} tone="danger" />
    </Modal>
  );
}

/** The one rename. Name and why together, then both are locked. */
export function RenameDialog({
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
  return (
    <Modal title="Rename" onClose={onCancel}>
      <Lead>Rename (one time). After this, the name and why are locked.</Lead>
      <label className={LABEL}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))} className={FIELD} />
      <div className="mt-1 flex justify-end">
        <CharCount value={name} max={LIMITS.name} />
      </div>
      <label className={`${LABEL} mt-3`}>Why</label>
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value.slice(0, LIMITS.why))}
        rows={4}
        className={`${FIELD} resize-none`}
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={why} max={LIMITS.why} />
      </div>
      <ErrorLine text={error} />
      <Buttons
        onCancel={onCancel}
        onConfirm={() => onConfirm(name.trim(), why.trim())}
        confirm="Rename"
        working="Saving…"
        busy={busy}
        disabled={!name.trim() || !why.trim() || !changed}
        tone="flame"
      />
    </Modal>
  );
}

