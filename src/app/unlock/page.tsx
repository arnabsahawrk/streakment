"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  askForUnlock,
  BiometricError,
  biometricName,
  biometricSupported,
  clearBiometricMarker,
  errorMessage,
  finishUnlock,
  getBiometricMarker,
  isFresh,
  prepareUnlock,
  type PreparedUnlock,
} from "@/lib/biometric";
import { markTabUnlocked } from "@/lib/tabLock";

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [misses, setMisses] = useState(0);

  // Biometric unlock. Only offered on a device that turned it on in Settings
  // and whose browser can do it; the passcode form below works either way.
  const [bio, setBio] = useState<"off" | "ready">("off");
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  const [reloadToRetry, setReloadToRetry] = useState(false);
  const prepared = useRef<PreparedUnlock | null>(null);
  const working = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", passcode }),
    });
    setBusy(false);
    if (res.ok) {
      markTabUnlocked();
      router.replace("/");
      router.refresh();
    } else {
      setErr("Wrong passcode.");
      setPasscode("");
      setMisses((m) => m + 1);
    }
  }

  async function forgot() {
    setRecovering(true);
    setErr(null);
    const res = await fetch("/api/passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recover" }),
    });
    setRecovering(false);
    if (res.ok) setRecovered(true);
    else setErr("Couldn't send it.");
  }

  function dropBiometrics(message: string) {
    // Removed from another device, or the passcode was removed and set again.
    clearBiometricMarker();
    setBio("off");
    setErr(message);
  }

  /** Gets a one-time challenge ready ahead of the tap, so the Touch ID / Face
   *  ID sheet can open straight from the tap itself (Safari insists on that). */
  const refresh = useCallback(async () => {
    const id = getBiometricMarker();
    if (!id) return;
    try {
      prepared.current = await prepareUnlock(id);
    } catch (e) {
      prepared.current = null;
      if (e instanceof BiometricError && e.kind === "unknown-credential") {
        clearBiometricMarker();
        setBio("off");
        setErr(e.message);
      }
      // Offline or a server hiccup: the button stays, and retries on tap.
    }
  }, []);

  async function unlockWithBiometrics() {
    const id = getBiometricMarker();
    if (!id || working.current) return;
    working.current = true;
    setBioBusy(true);
    setBioMsg(null);
    setErr(null);
    try {
      // The browser prompt is the first thing this tap does whenever a
      // challenge is already waiting. If one isn't, it is fetched first,
      // which Safari also accepts as part of the same tap.
      const ready = prepared.current;
      prepared.current = null;
      const answer =
        ready && isFresh(ready)
          ? await askForUnlock(ready)
          : await prepareUnlock(id).then(askForUnlock);
      await finishUnlock(answer);
      markTabUnlocked();
      // A fresh page load rather than a client-side route: iOS Safari has been
      // seen to refuse a second prompt within one page session (WebKit bug
      // 241126), and this way every unlock starts from a clean one.
      window.location.replace("/");
      return;
    } catch (e) {
      if (e instanceof BiometricError && e.kind === "unknown-credential") {
        dropBiometrics(e.message);
      } else {
        setBioMsg(errorMessage(e, "Biometrics didn't work. Enter the passcode instead."));
        // Same bug: after a failed prompt the safe retry is a fresh page.
        setReloadToRetry(true);
      }
    }
    working.current = false;
    setBioBusy(false);
  }

  useEffect(() => {
    if (!getBiometricMarker()) return;
    // Show the button straight away; if the browser turns out not to support
    // it after all, it quietly goes again.
    setBio("ready");
    let alive = true;
    (async () => {
      if (!(await biometricSupported())) {
        if (alive) setBio("off");
        return;
      }
      if (alive) await refresh();
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  // Coming back to the lock screen after a while: the waiting challenge may
  // have expired, so line up a new one.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        getBiometricMarker() &&
        !working.current &&
        !reloadToRetry &&
        !isFresh(prepared.current)
      ) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh, reloadToRetry]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-paper-dim">Locked</p>
        <h1 className="mb-6 text-2xl font-semibold">
          {bio === "ready" ? "Unlock" : "Enter passcode"}
        </h1>

        {bio === "ready" && (
          <div className="sm-fade">
            <button
              type="button"
              onClick={reloadToRetry ? () => window.location.reload() : unlockWithBiometrics}
              disabled={bioBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-flame px-4 py-3 font-semibold text-ash disabled:opacity-40"
            >
              <Fingerprint size={20} aria-hidden="true" />
              {bioBusy
                ? "Waiting…"
                : reloadToRetry
                  ? "Reload to try again"
                  : `Use ${biometricName()}`}
            </button>
            {bioMsg && (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {bioMsg}
              </p>
            )}
            <p className="my-4 text-center text-xs text-paper-dim">or use the passcode</p>
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="••••"
          className="w-full rounded-lg border border-ember-line bg-ash-raised px-4 py-3 font-mono text-lg tracking-widest focus:border-flame focus:outline-none"
        />
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={busy || !passcode}
          className={`mt-4 w-full rounded-lg py-3 font-semibold disabled:opacity-40 ${
            bio === "ready" ? "border border-ember-line text-paper" : "bg-flame text-ash"
          }`}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>

        {misses >= 3 && (
          <div className="mt-5 text-center">
            {recovered ? (
              <p className="text-xs text-flame">Sent to email.</p>
            ) : (
              <button
                type="button"
                onClick={forgot}
                disabled={recovering}
                className="text-xs text-paper-dim underline-offset-2 hover:text-paper hover:underline disabled:opacity-40"
              >
                {recovering ? "Sending…" : "Forgot passcode?"}
              </button>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
