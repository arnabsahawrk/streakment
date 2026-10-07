"use client";

import { useState } from "react";
import Modal from "./Modal";
import BiometricSettings from "./BiometricSettings";
import Segmented from "./Segmented";
import { clearBiometricMarker } from "@/lib/biometric";
import { SORTS, setSort, useSort } from "@/lib/sort";
import { markTabUnlocked } from "@/lib/tabLock";
import type { UserSettings } from "@/lib/types";

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="press flex w-full items-center justify-between gap-4 rounded-lg border border-ember-line bg-ash px-3 py-3 text-left"
    >
      <span className="text-sm">{label}</span>
      <span
        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${checked ? "bg-flame" : "bg-ember-line"}`}
      >
        <span className={`block h-4 w-4 rounded-full bg-paper transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}


const H = ({ children }: { children: string }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">{children}</p>
);

function OrderSettings() {
  const sort = useSort();
  return (
    <div className="mb-5">
      <H>Order</H>
      <Segmented id="sort" label="Order of streakments" value={sort} options={SORTS} onChange={setSort} />
    </div>
  );
}

export default function SettingsSheet({
  settings, onClose, onSaved,
}: { settings: UserSettings; onClose: () => void; onSaved: (s: UserSettings) => void }) {
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
      if (!res.ok) throw new Error(data?.error || "Couldn't update it.");
      const updated = { ...s, has_passcode: action !== "remove" };
      setS(updated); onSaved(updated); setCurrent(""); setNext("");
      if (action !== "remove") markTabUnlocked();
      else clearBiometricMarker(); // biometric unlock goes with the passcode
      setMsg(action === "remove" ? "Removed." : "Saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update it.");
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <OrderSettings />

      <H>Email</H>
      <div className="mb-5">
        <Toggle
          label="Email Notifications"
          checked={s.email_milestones}
          onChange={(v) => patch({ email_milestones: v })}
        />
      </div>


      <H>App passcode</H>
      <p className="mb-2 text-[11px] text-paper-dim">
        {s.has_passcode ? "Set." : "Off — anyone who opens the app sees everything."}
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
              className="press flex-1 rounded-lg bg-flame py-2 text-sm font-semibold text-ash disabled:opacity-40"
            >
              Change
            </button>
            <button
              onClick={() => passcode("remove")}
              disabled={busy || current.length < 4}
              className="press flex-1 rounded-lg border border-ember-line py-2 text-sm text-paper-dim hover:text-red-400 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
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
            className="press shrink-0 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-ash disabled:opacity-40"
          >
            Set
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
      {msg && <p className="mt-3 text-xs text-flame">{msg}</p>}

      {s.has_passcode && <BiometricSettings />}
    </Modal>
  );
}
