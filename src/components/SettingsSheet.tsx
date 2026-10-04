"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Download } from "lucide-react";
import Modal from "./Modal";
import BiometricSettings from "./BiometricSettings";
import { ClockLine } from "./ClockLine";
import Segmented from "./Segmented";
import { clearBiometricMarker } from "@/lib/biometric";
import { copyBackup } from "@/lib/backup";
import { now, setPrefs, useDeviceZone, useHour12, usePin } from "@/lib/clock";
import { SORTS, setSort, useSort } from "@/lib/sort";
import { markTabUnlocked } from "@/lib/tabLock";
import type { UserSettings } from "@/lib/types";
import { offsetLabel, zoneGroups, zoneLabel } from "@/lib/zone";

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

/** Zone and clock style. Both are display choices kept on this device, so
 *  they take effect the instant they're tapped and never touch the
 *  database. */
function TimeSettings() {
  const device = useDeviceZone();
  const pin = usePin();
  const h12 = useHour12();
  const shown = pin ?? device;

  const groups = useMemo(() => {
    const at = now();
    return zoneGroups(pin).map((g) => ({
      region: g.region,
      zones: g.zones.map((z) => ({ z, label: `${zoneLabel(z)} (${offsetLabel(at, z)})` })),
    }));
  }, [pin]);

  return (
    <div className="mb-5">
      <H>Time</H>
      <div className="mb-3 rounded-lg border border-ember-line bg-ash px-3 py-2.5">
        <ClockLine className="text-[11px] leading-relaxed text-paper-dim" />
      </div>

      <Segmented
        id="zone"
        label="Time zone"
        value={pin ? "pinned" : "auto"}
        options={[
          { key: "auto", label: "Follow this device" },
          { key: "pinned", label: "Pin a zone" },
        ]}
        onChange={(k) => setPrefs({ pin: k === "pinned" ? (pin ?? device) : null })}
        className="mb-2"
      />
      <p className="mb-2 text-[11px] text-paper-dim">
        {pin
          ? "Everything is shown in this zone, wherever this device goes."
          : `Updates by itself when the device changes zone. Right now: ${zoneLabel(device)}.`}
      </p>

      <AnimatePresence initial={false}>
        {pin && (
          <motion.div
            key="pick"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <select
              value={pin}
              onChange={(e) => setPrefs({ pin: e.target.value })}
              aria-label="Pinned time zone"
              className="mb-2 w-full rounded-lg border border-ember-line bg-ash px-3 py-2.5 text-sm focus:border-flame focus:outline-none"
            >
              {groups.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.zones.map(({ z, label }) => (
                    <option key={z} value={z}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      <Segmented
        id="clock"
        label="Clock style"
        value={h12 ? "12" : "24"}
        options={[
          { key: "24", label: "24-hour" },
          { key: "12", label: "12-hour" },
        ]}
        onChange={(k) => setPrefs({ h12: k === "12" })}
        className="mt-1"
      />
      <span className="sr-only">Showing {zoneLabel(shown)}</span>
    </div>
  );
}

function OrderSettings() {
  const sort = useSort();
  return (
    <div className="mb-5">
      <H>Order</H>
      <Segmented id="sort" label="Order of streakments" value={sort} options={SORTS} onChange={setSort} />
      <p className="mt-2 text-[11px] text-paper-dim">
        Shortest first keeps the one closest to breaking at the top.
      </p>
    </div>
  );
}

function BackupSettings() {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "failed">("idle");
  async function copy() {
    setState("busy");
    const ok = await copyBackup();
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2200);
  }
  const btn =
    "press flex flex-1 items-center justify-center gap-2 rounded-lg border border-ember-line bg-ash py-2.5 text-sm hover:border-paper-dim";
  return (
    <div className="mb-5">
      <H>Backup</H>
      <div className="flex gap-2">
        <a href="/api/export" download className={btn}>
          <Download size={15} aria-hidden /> Download
        </a>
        <button type="button" onClick={copy} disabled={state === "busy"} className={`${btn} disabled:opacity-50`}>
          <Copy size={15} aria-hidden />
          {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-paper-dim">
        Every streakment, break and note in one file. The passcode is never included.
      </p>
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
      <TimeSettings />
      <OrderSettings />

      <H>Email</H>
      <div className="mb-5">
        <Toggle
          label="Email Notifications"
          checked={s.email_milestones}
          onChange={(v) => patch({ email_milestones: v })}
        />
      </div>

      <BackupSettings />

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
