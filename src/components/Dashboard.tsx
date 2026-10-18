"use client";

import { noteServerDate, now, useMinute, useZone } from "@/lib/clock";
import { sortInfinite, sortStreaks, useSort } from "@/lib/sort";
import { dropStatsCache } from "@/lib/statsCache";
import { isCompleted, isStopped, kindOf } from "@/lib/streak";
import { clearTabUnlocked, isTabUnlocked } from "@/lib/tabLock";
import type { ArchiveResult, Streak, UserSettings } from "@/lib/types";
import { ChartColumn, Menu, Unlock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import InfiniteMark from "./InfiniteMark";
import { ClockPanel } from "./LiveClock";
import Loading from "./Loading";
import PathStrip from "./PathStrip";
import { loadDialogs, loadJourney, loadRoadmap } from "./lazy";
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

// An Infinite card only exists once a Legend has gone on as one. The menu and
// the Add dialog open on a tap, so they too load on demand (and are warmed).
const loadInfinite = () => import("./InfiniteCard");
const loadSidebar = () => import("./Sidebar");
const loadAdd = () => import("./AddStreakDialog");
const InfiniteCard = dynamic(loadInfinite, { ssr: false });
const Sidebar = dynamic(loadSidebar, { ssr: false });
const AddStreakDialog = dynamic(() => loadAdd().then((m) => m.AddStreakDialog), { ssr: false });

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
  const [view, setView] = useState<"main" | "infinite">("main");
  const sort = useSort();
  const minute = useMinute();
  const zone = useZone();

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

  // Keep the saved time zone matching the device, so the emails quote times
  // in the zone the phone is actually in. It's an existing settings field,
  // written only on the rare occasion the zone changes.
  useEffect(() => {
    if (!zone || zone === settings.timezone) return;
    const t = setTimeout(() => {
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: zone }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((next) => next && setSettings(next))
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, [zone, settings.timezone]);

  useEffect(() => {
    const t = setTimeout(() => {
      (Object.keys(loaders) as (keyof typeof loaders)[]).forEach(warm);
      // What a card opens (its dialogs, journey and roadmap), also ready ahead of the tap.
      void loadDialogs();
      void loadJourney();
      void loadRoadmap();
      void loadSidebar();
      void loadAdd();
    }, 3000);
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

  // A card leaves the home screen: archived, or a failed Challenge. When a
  // Legend went on as Infinite, its new card arrives in the same step.
  const archived = useCallback((r: ArchiveResult) => {
    dropStatsCache();
    setStreaks((list) => {
      if (!list) return list;
      const rest = list.filter((x) => x.id !== r.archived.id);
      return r.infinite ? [...rest, r.infinite] : rest;
    });
  }, []);

  const nowMs = minute ? minute * 60_000 : now();

  const { mine, infinites } = useMemo(() => {
    const all = streaks ?? [];
    return {
      mine: all.filter((s) => kindOf(s) !== "infinite"),
      infinites: all.filter((s) => kindOf(s) === "infinite"),
    };
  }, [streaks]);

  const sortedMine = useMemo(() => sortStreaks(mine, sort, nowMs), [mine, sort, nowMs]);
  const sortedInfinite = useMemo(() => sortInfinite(infinites, nowMs), [infinites, nowMs]);

  // The Infinite view only exists while there is an Infinite streakment.
  const showInfinite = view === "infinite" && infinites.length > 0;

  const paused = mine.filter((s) => !s.start_date).length;
  const completed = mine.filter((s) => isCompleted(s, nowMs)).length;
  const alive = mine.length - paused - completed;
  const stopped = infinites.filter((s) => isStopped(s)).length;
  const counting = infinites.length - stopped;

  const summary = showInfinite
    ? `${counting} counting · ${stopped} stopped`
    : [`${alive} alive`, paused > 0 && `${paused} paused`, completed > 0 && `${completed} completed`]
        .filter(Boolean)
        .join(" · ");

  const pill =
    "press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] hover:text-paper";

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
            onPointerDown={() => void loadSidebar()}
            aria-label="Menu"
            className="press rounded-lg border border-ember-line p-2 text-paper-dim hover:text-paper"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      <ClockPanel />

      {streaks && streaks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
        >
          <p className="min-w-0 text-xs text-paper-dim">{summary}</p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={() => setSheet("stats")}
              onPointerDown={() => warm("stats")}
              className={`${pill} border-ember-line text-paper-dim`}
            >
              <ChartColumn size={13} aria-hidden /> Stats
            </button>
            {infinites.length > 0 && (
              <button
                onClick={() => setView(showInfinite ? "main" : "infinite")}
                aria-pressed={showInfinite}
                className={`${pill} ${showInfinite ? "border-gold/70 bg-gold/10 text-paper" : "border-ember-line text-paper-dim"}`}
              >
                <InfiniteMark width={17} stroke={2.4} foil={false} /> Infinite
              </button>
            )}
          </div>
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
      ) : (showInfinite ? sortedInfinite : sortedMine).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-dashed border-ember-line px-6 py-14 text-center"
        >
          <p className="mx-auto mb-5 max-w-xs text-lg font-semibold">
            {streaks.length === 0 ? "Nothing started yet. Start with one small challenge." : "Nothing running now. Start the next one."}
          </p>
          <PathStrip active="challenge" center className="mx-auto mb-6 max-w-xs text-[11px] text-paper-dim" />
          <button
            onClick={() => setAdding(true)}
            onPointerDown={() => void loadAdd()}
            className="press rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-ash"
          >
            {streaks.length === 0 ? "Start the first one" : "Start a new one"}
          </button>
        </motion.div>
      ) : (
        <div className="relative flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {(showInfinite ? sortedInfinite : sortedMine).map((s, i) => (
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
                {kindOf(s) === "infinite" ? (
                  <InfiniteCard streak={s} onSaved={saved} />
                ) : (
                  <StreakCard streak={s} onSaved={saved} onArchived={archived} />
                )}
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
              setView("main");
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
