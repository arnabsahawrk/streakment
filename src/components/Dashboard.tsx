"use client";

import { noteServerDate, now, useMinute } from "@/lib/clock";
import { trackOpens } from "@/lib/opens";
import { sortStreaks, useSort } from "@/lib/sort";
import { dropStatsCache } from "@/lib/statsCache";
import { clearTabUnlocked, isTabUnlocked } from "@/lib/tabLock";
import type { Streak, UserSettings } from "@/lib/types";
import { ChartColumn, Menu, Unlock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddStreakDialog } from "./Dialogs";
import { NowPanel } from "./LiveClock";
import Loading from "./Loading";
import Sidebar from "./Sidebar";
import StreakCard from "./StreakCard";

// The three big screens are opened now and then, not every visit, so their
// code loads on demand. Touching their button starts the download a beat
// before the tap lands, and a quiet pass after the page settles warms them,
// so opening one still feels instant.
const loaders = {
  archive: () => import("./ArchiveSheet"),
  settings: () => import("./SettingsSheet"),
  stats: () => import("./StatsSheet"),
};
const ArchiveSheet = dynamic(loaders.archive, { ssr: false });
const SettingsSheet = dynamic(loaders.settings, { ssr: false });
const StatsSheet = dynamic(loaders.stats, { ssr: false });
const warm = (what: keyof typeof loaders) => void loaders[what]();

type Sheet = "archive" | "settings" | "stats" | null;

export default function Dashboard({ settings: initialSettings }: { settings: UserSettings }) {
  const router = useRouter();
  const [streaks, setStreaks] = useState<Streak[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [adding, setAdding] = useState(false);
  const [locking, setLocking] = useState(false);
  const sort = useSort();
  const minute = useMinute();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const res = await fetch("/api/streaks");
      noteServerDate(res);
      if (res.status === 401) {
        router.replace("/unlock");
        return;
      }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("bad response");
      setStreaks(data);
    } catch {
      setLoadFailed(true);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => trackOpens(), []);

  useEffect(() => {
    const t = setTimeout(() => (Object.keys(loaders) as (keyof typeof loaders)[]).forEach(warm), 3000);
    return () => clearTimeout(t);
  }, []);

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

  // Each change comes back from the server as the finished row, so the list
  // is updated in place instead of being fetched all over again.
  const saved = useCallback((s: Streak) => {
    dropStatsCache();
    setStreaks((list) => (list ? list.map((x) => (x.id === s.id ? s : x)) : list));
  }, []);
  const archived = useCallback((id: string) => {
    dropStatsCache();
    setStreaks((list) => (list ? list.filter((x) => x.id !== id) : list));
  }, []);

  const sorted = useMemo(
    () => (streaks ? sortStreaks(streaks, sort, minute ? minute * 60_000 : now()) : []),
    [streaks, sort, minute],
  );
  const paused = sorted.filter((s) => !s.start_date).length;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-5 sm:pt-12">
      <header className="mb-5 flex items-start justify-between gap-4">
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
              className="press rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper disabled:opacity-40"
            >
              <Unlock size={18} />
            </button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="press rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      <NowPanel streaks={streaks} onOpenTime={() => setSheet("settings")} />

      {sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 mt-4 flex items-center justify-between gap-3"
        >
          <p className="text-xs text-paper-dim">
            {sorted.length - paused} alive{paused > 0 && ` · ${paused} paused`}
          </p>
          <button
            onClick={() => setSheet("stats")}
            onPointerDown={() => warm("stats")}
            className="press inline-flex items-center gap-1.5 rounded-full border border-ember-line px-3 py-1.5 text-[11px] text-paper-dim hover:text-paper"
          >
            <ChartColumn size={13} aria-hidden /> Stats
          </button>
        </motion.div>
      )}

      {streaks === null ? (
        loadFailed ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ember-line px-6 py-12 text-center sm-fade">
            <p className="mb-1 text-lg font-semibold">Couldn&apos;t load</p>
            <p className="mb-5 text-sm text-paper-dim">Check the connection and try again.</p>
            <button
              onClick={load}
              className="press rounded-full border border-ember-line px-5 py-2 text-sm text-paper hover:border-flame"
            >
              Try again
            </button>
          </div>
        ) : (
          <Loading />
        )
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-dashed border-ember-line px-6 py-14 text-center"
        >
          <p className="mb-1 text-lg font-semibold">Nothing lit yet</p>
          <p className="mx-auto mb-6 max-w-xs text-sm text-paper-dim">
            Start with one thing. Not the hardest — the one I&apos;m most ready for.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="press rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-ash"
          >
            Light the first one
          </button>
        </motion.div>
      ) : (
        <div className="relative flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {sorted.map((s, i) => (
              <motion.div
                key={s.id}
                layout="position"
                initial={{ opacity: 0, y: 18 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: Math.min(i, 5) * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
              >
                <StreakCard streak={s} onSaved={saved} onArchived={archived} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <Sidebar
            key="menu"
            onClose={() => setMenuOpen(false)}
            onOpen={(w) => (w === "add" ? setAdding(true) : setSheet(w))}
            onIntent={warm}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {adding && (
          <AddStreakDialog
            key="add"
            onClose={() => setAdding(false)}
            onCreated={(row) => {
              dropStatsCache();
              setAdding(false);
              setStreaks((list) => (list ? [...list, row] : [row]));
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "archive" && <ArchiveSheet key="archive" onClose={() => setSheet(null)} />}
        {sheet === "settings" && (
          <SettingsSheet key="settings" settings={settings} onClose={() => setSheet(null)} onSaved={setSettings} />
        )}
        {sheet === "stats" && <StatsSheet key="stats" onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </main>
  );
}
