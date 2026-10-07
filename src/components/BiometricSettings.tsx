"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  askToRegister,
  biometricName,
  biometricSupported,
  clearBiometricMarker,
  errorMessage,
  finishRegistration,
  getBiometricMarker,
  isFresh,
  listDevices,
  prepareRegistration,
  removeDevice,
  setBiometricMarker,
  type PreparedRegistration,
} from "@/lib/biometric";
import { formatDate } from "@/lib/format";
import type { BiometricDevice } from "@/lib/types";

/** Biometric unlock settings. Shown only once a passcode is set: this is a
 *  second way past that passcode, never a replacement for it.
 *
 *  Each device (and each browser or installed app on it) is switched on
 *  separately, because the fingerprint or face never leaves the device.
 *  They all appear in one list, so a lost phone can be cut off from any
 *  other device. */
export default function BiometricSettings() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<BiometricDevice[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [marker, setMarker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const prepared = useRef<PreparedRegistration | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await listDevices();
      setDevices(list);
      setLoadErr(null);
      const mine = getBiometricMarker();
      if (mine && !list.some((d) => d.id === mine)) {
        // Removed from another device: this one is off now too.
        clearBiometricMarker();
        setMarker(null);
      }
    } catch (e) {
      setDevices([]);
      setLoadErr(errorMessage(e, "Couldn't load biometric settings."));
    }
  }, []);

  /** Gets a one-time challenge ready ahead of the tap, so the Touch ID / Face
   *  ID sheet can open straight from the tap itself (Safari insists on that). */
  const prefetch = useCallback(async () => {
    try {
      prepared.current = await prepareRegistration();
    } catch {
      prepared.current = null; // fetched on tap instead
    }
  }, []);

  useEffect(() => {
    setMarker(getBiometricMarker());
    void biometricSupported().then(setSupported);
    void load();
  }, [load]);

  useEffect(() => {
    if (!supported || marker || !devices || loadErr) return;
    if (!isFresh(prepared.current)) void prefetch();
  }, [supported, marker, devices, loadErr, prefetch]);

  async function enable() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      // The browser prompt is the first thing this tap does whenever a
      // challenge is already waiting; otherwise it is fetched first, which
      // Safari also accepts as part of the same tap.
      const ready = prepared.current;
      prepared.current = null;
      const answer =
        ready && isFresh(ready)
          ? await askToRegister(ready)
          : await prepareRegistration().then(askToRegister);
      const id = await finishRegistration(answer);
      setBiometricMarker(id);
      setMarker(id);
      await load();
      setMsg("Turned on for this device.");
    } catch (e) {
      setErr(errorMessage(e, "Couldn't turn it on for this device."));
      void prefetch();
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: BiometricDevice) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await removeDevice(d.id);
      const mine = d.id === getBiometricMarker();
      if (mine) {
        clearBiometricMarker();
        setMarker(null);
      }
      await load();
      setMsg(mine ? "Turned off for this device." : "Removed.");
    } catch (e) {
      setErr(errorMessage(e, "Couldn't remove it."));
    } finally {
      setBusy(false);
    }
  }

  // Nothing to show until it's known whether this browser can do it at all.
  if (supported === null || devices === null) return null;

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">
        Biometric unlock
      </p>

      {loadErr ? (
        <p className="text-xs text-red-400">{loadErr}</p>
      ) : (
        <>
          {supported ? (
            <>
              <p className="mb-2 text-[11px] text-paper-dim">
                {marker
                  ? `On for this device. It unlocks with ${biometricName()}, and the passcode still works.`
                  : `Off for this device. Unlock with ${biometricName()} instead of typing the passcode.`}
              </p>
              {!marker && (
                <button
                  onClick={enable}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-flame py-2 text-sm font-semibold text-ash disabled:opacity-40"
                >
                  <Fingerprint size={16} aria-hidden="true" />
                  {busy ? "Waiting…" : "Turn on for this device"}
                </button>
              )}
            </>
          ) : (
            <p className="mb-2 text-[11px] text-paper-dim">
              Not available in this browser. It needs Touch ID, Face ID, a fingerprint or Windows
              Hello set up on this device.
            </p>
          )}

          {devices.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {devices.map((d) => {
                const mine = d.id === marker;
                return (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-ember-line bg-ash px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 break-words text-sm">{d.label}</p>
                        {mine && (
                          <span className="shrink-0 whitespace-nowrap rounded-full border border-flame/40 px-2 py-0.5 text-[10px] text-flame">
                            This device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-paper-dim">
                        Added {formatDate(d.created_at)}
                      </p>
                      <p className="text-[11px] text-paper-dim">
                        {d.last_used_at ? `Last used ${formatDate(d.last_used_at)}` : "Not used yet"}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(d)}
                      disabled={busy}
                      className="press shrink-0 py-0.5 text-xs text-paper-dim hover:text-red-400 disabled:opacity-40"
                    >
                      {mine ? "Turn off" : "Remove"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
      {msg && <p className="mt-3 text-xs text-flame">{msg}</p>}
    </section>
  );
}
