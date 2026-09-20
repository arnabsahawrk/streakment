"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, Plus } from "lucide-react";
import StreakCard from "./StreakCard";
import Sidebar from "./Sidebar";
import ArchiveSheet from "./ArchiveSheet";
import SettingsSheet from "./SettingsSheet";
import Loading from "./Loading";
import { AddStreakDialog } from "./Dialogs";
import { currentStreakDays } from "@/lib/streak";
import type { Streak, UserSettings } from "@/lib/types";

type Sheet = "archive" | "settings" | null;

export default function Dashboard({
  settings: initialSettings,
}: {
  settings: UserSettings;
}) {
  const [streaks, setStreaks] = useState<Streak[] | null>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/streaks");
    const data = await res.json().catch(() => []);
    setStreaks(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Shortest run first: the one closest to breaking sits at the top.
  const sorted = streaks
    ? [...streaks].sort(
        (a, b) => currentStreakDays(a.start_date) - currentStreakDays(b.start_date)
      )
    : [];

  return (
    <main className="mx-auto max-w-2xl px-5 pb-32 pt-8 sm:pt-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">STREAKMENT</h1>
          <p className="mt-0.5 text-sm text-flame">Keep the streakment alive.</p>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper"
        >
          <Menu size={18} />
        </button>
      </header>

      {sorted.length > 0 && (
        <p className="mb-5 text-xs text-paper-dim">
          {sorted.length} {sorted.length === 1 ? "streakment" : "streakments"} running
        </p>
      )}

      {streaks === null ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ember-line px-6 py-16 text-center">
          <p className="mb-1 text-lg font-semibold">Nothing lit yet</p>
          <p className="prose-text mx-auto mb-6 max-w-xs text-sm text-paper-dim">
            Start with one thing. Not the hardest thing — the one you&apos;re most ready
            to hold.
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

      <button
        onClick={() => setAdding(true)}
        aria-label="New streakment"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-flame text-ash shadow-[0_8px_30px_rgba(255,107,53,0.35)] transition-transform active:scale-95 sm:bottom-10 sm:right-10"
      >
        <Plus size={26} />
      </button>

      {menuOpen && (
        <Sidebar
          onClose={() => setMenuOpen(false)}
          onOpen={(w) => setSheet(w)}
        />
      )}
      {adding && (
        <AddStreakDialog onClose={() => setAdding(false)} onCreated={() => { setAdding(false); load(); }} />
      )}
      {sheet === "archive" && <ArchiveSheet onClose={() => setSheet(null)} />}
      {sheet === "settings" && (
        <SettingsSheet settings={settings} onClose={() => setSheet(null)} onSaved={setSettings} />
      )}
    </main>
  );
}
