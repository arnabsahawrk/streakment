"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { markTabUnlocked } from "@/lib/tabLock";

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [misses, setMisses] = useState(0);

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

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-paper-dim">Locked</p>
        <h1 className="mb-6 text-2xl font-semibold">Enter passcode</h1>
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
          className="mt-4 w-full rounded-lg bg-flame py-3 font-semibold text-ash disabled:opacity-40"
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
