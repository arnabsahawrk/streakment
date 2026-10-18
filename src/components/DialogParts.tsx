"use client";

import type { ReactNode } from "react";
import CharCount from "./CharCount";

/** The pieces every dialog is built from: short, direct, no cheerleading. */

export const FIELD =
  "w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none";
export const GHOST = "press flex-1 rounded-lg border border-ember-line py-2.5 text-sm text-paper-dim hover:text-paper";
export const LABEL = "mb-1.5 block text-xs text-paper-dim";

const TONES = {
  flame: "bg-flame text-ash",
  gold: "bg-gold text-ash",
  danger: "bg-red-500/90 text-ash",
} as const;

export function Buttons({
  onCancel,
  onConfirm,
  confirm,
  working,
  busy,
  disabled,
  tone,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirm: string;
  working: string;
  busy: boolean;
  disabled?: boolean;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="mt-5 flex gap-2">
      <button type="button" onClick={onCancel} className={GHOST}>
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy || disabled}
        className={`press flex-[1.7] rounded-lg px-2 py-2.5 text-sm font-semibold disabled:opacity-40 ${TONES[tone]}`}
      >
        {busy ? working : confirm}
      </button>
    </div>
  );
}

export function Note({
  label,
  value,
  onChange,
  max,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <>
      <label className={LABEL}>{label}</label>
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        rows={3}
        placeholder={placeholder}
        className={`${FIELD} resize-none`}
      />
      <div className="mt-1 flex justify-end">
        <CharCount value={value} max={max} />
      </div>
    </>
  );
}

export function NameConfirm({ name, typed, onChange }: { name: string; typed: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className={`${LABEL} mt-4`}>Type the name to confirm</label>
      <p className="mb-2 break-words font-mono text-sm text-paper">{name}</p>
      <input value={typed} onChange={(e) => onChange(e.target.value)} placeholder="Type it exactly" className={FIELD} />
    </>
  );
}

export const ErrorLine = ({ text }: { text?: string | null }) =>
  text ? (
    <p role="alert" className="mt-3 text-xs text-red-400">
      {text}
    </p>
  ) : null;

export const Lead = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 text-sm leading-relaxed text-paper-dim">{children}</p>
);

