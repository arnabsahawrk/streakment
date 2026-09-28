"use client";

import { currentStreakDays } from "@/lib/streak";
import { clearTabUnlocked, isTabUnlocked } from "@/lib/tabLock";
import type { Streak, UserSettings } from "@/lib/types";
import { Menu, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ArchiveSheet from "./ArchiveSheet";
import { AddStreakDialog } from "./Dialogs";
import Loading from "./Loading";
import SettingsSheet from "./SettingsSheet";
import Sidebar from "./Sidebar";
import StreakCard from "./StreakCard";

type Sheet = "archive" | "settings" | null;

export default function Dashboard({ settings: initialSettings }: { settings: UserSettings }) {
  const router = useRouter();
  const [streaks, setStreaks] = useState<Streak[] | null>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [adding, setAdding] = useState(false);
  const [locking, setLocking] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/streaks");
    const data = await res.json().catch(() => []);
    setStreaks(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A passcode is checked server-side by page.tsx, but that cookie lives
  // for the whole browser session - reopening a closed tab would still
  // pass it. Two things fix that: this tab-scoped sessionStorage check
  // on mount, and the beacon below that actively locks the moment this
  // tab actually closes, so even a browser that restores sessionStorage
  // for a reopened tab still finds the server-side cookie gone.
  useEffect(() => {
    if (initialSettings.has_passcode && !isTabUnlocked()) {
      router.replace("/unlock");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialSettings.has_passcode) return;
    const onHide = () => {
      navigator.sendBeacon(
        "/api/passcode",
        new Blob([JSON.stringify({ action: "lock" })], { type: "application/json" }),
      );
    };
    // pagehide covers real tab/browser close and navigating away; it does
    // not fire for in-app client-side routing (the Lock button below uses
    // router.replace, which never triggers this).
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [initialSettings.has_passcode]);

  async function lockNow() {
    setLocking(true);
    try {
      await fetch("/api/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      clearTabUnlocked();
      router.replace("/unlock");
    } finally {
      setLocking(false);
    }
  }

  // Shortest run first: the one closest to breaking sits at the top.
  const sorted = streaks
    ? [...streaks].sort((a, b) => currentStreakDays(a.start_date) - currentStreakDays(b.start_date))
    : [];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-5 sm:pt-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">STREAKMENT</h1>
          <p className="mt-0.5 text-sm text-flame">Keep the streakment alive.</p>
        </div>
        <div className="flex items-center gap-2">
          {settings.has_passcode && (
            <button
              onClick={lockNow}
              disabled={locking}
              aria-label="Lock"
              className="rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper disabled:opacity-40"
            >
              <Unlock size={18} />
            </button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {sorted.length > 0 && (
        <p className="mb-5 text-xs text-paper-dim">
          {sorted.length} {sorted.length === 1 ? "streakment" : "streakments"} alive
        </p>
      )}

      {streaks === null ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ember-line px-6 py-14 text-center">
          <p className="mb-1 text-lg font-semibold">Nothing lit yet</p>
          <p className="mx-auto mb-6 max-w-xs text-sm text-paper-dim">
            Start with one thing. Not the hardest — the one I&apos;m most ready for.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-ash"
          >
            Light the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((s) => (
            <StreakCard key={s.id} streak={s} onChange={load} />
          ))}
        </div>
      )}

      {menuOpen && (
        <Sidebar
          onClose={() => setMenuOpen(false)}
          onOpen={(w) => (w === "add" ? setAdding(true) : setSheet(w))}
        />
      )}
      {adding && (
        <AddStreakDialog
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {sheet === "archive" && <ArchiveSheet onClose={() => setSheet(null)} />}
      {sheet === "settings" && (
        <SettingsSheet settings={settings} onClose={() => setSheet(null)} onSaved={setSettings} />
      )}
    </main>
  );
}
