"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import type { UserSettings } from "@/lib/types";

function Toggle({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-lg border border-ember-line bg-ash px-3 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        <span className="prose-text mt-0.5 block text-[11px] text-paper-dim">{hint}</span>
      </span>
      <span
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${checked ? "bg-flame" : "bg-ember-line"}`}
      >
        <span className={`block h-4 w-4 rounded-full bg-paper transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

export default function SettingsSheet({
  settings, onClose, onSaved,
}: { settings: UserSettings; onClose: () => void; onSaved: (s: UserSettings) => void }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't save.");
      setS(data); onSaved(data); setMsg("Saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally { setBusy(false); }
  }

  async function passcode(action: "set" | "change" | "remove") {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const body =
        action === "change"
          ? { action, currentPasscode: current, newPasscode: next }
          : { action, passcode: action === "set" ? next : current };
      const res = await fetch("/api/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't update the passcode.");
      const updated = { ...s, has_passcode: action !== "remove" };
      setS(updated); onSaved(updated); setCurrent(""); setNext("");
      setMsg(action === "remove" ? "Passcode removed." : "Passcode saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update the passcode.");
    } finally { setBusy(false); }
  }

  async function lockNow() {
    setBusy(true);
    try {
      await fetch("/api/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      router.replace("/unlock");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">Email</p>
      <div className="mb-5 flex flex-col gap-2">
        <Toggle
          label="Milestone emails"
          hint="A note when you cross a step on a Climb, or finish a Challenge. Checked once a day. Turning this off mutes every streakment; each one can also be muted on its own from its card."
          checked={s.email_milestones}
          onChange={(v) => patch({ email_milestones: v })}
        />
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">
        App passcode
      </p>
      <p className="prose-text mb-2 text-[11px] text-paper-dim">
        {s.has_passcode
          ? "Set. You'll be asked for it each time the app is opened fresh."
          : "Off. Anyone who opens the app sees everything — set one to lock it."}
      </p>

      {s.has_passcode ? (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current passcode"
            className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 font-mono text-sm tracking-widest focus:border-flame focus:outline-none"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New passcode"
            className="w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 font-mono text-sm tracking-widest focus:border-flame focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => passcode("change")}
              disabled={busy || current.length < 4 || next.length < 4}
              className="flex-1 rounded-lg bg-flame py-2 text-sm font-semibold text-ash disabled:opacity-40"
            >
              Change
            </button>
            <button
              onClick={() => passcode("remove")}
              disabled={busy || current.length < 4}
              className="flex-1 rounded-lg border border-ember-line py-2 text-sm text-paper-dim hover:text-red-400 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
          <button
            onClick={lockNow}
            disabled={busy}
            className="mt-1 rounded-lg border border-ember-line py-2 text-sm text-paper-dim hover:border-flame hover:text-flame disabled:opacity-40"
          >
            Lock now
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Choose a passcode"
            className="min-w-0 flex-1 rounded-lg border border-ember-line bg-ash px-3 py-2.5 font-mono text-sm tracking-widest focus:border-flame focus:outline-none"
          />
          <button
            onClick={() => passcode("set")}
            disabled={busy || next.length < 4}
            className="shrink-0 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-ash disabled:opacity-40"
          >
            Set
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
      {msg && <p className="mt-3 text-xs text-flame">{msg}</p>}
    </Modal>
  );
}
