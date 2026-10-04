import { useSyncExternalStore } from "react";
import { currentStreakDays } from "./streak";
import type { Streak } from "./types";

/** How the streakments are ordered. A display choice, so it lives in this
 *  device's localStorage and costs the database nothing. */
export type SortKey = "short" | "long" | "new";

export const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "short", label: "Shortest first" },
  { key: "long", label: "Longest first" },
  { key: "new", label: "Newest" },
];

const KEY = "sm.sort.v1";
const listeners = new Set<() => void>();

function read(): SortKey {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "long" || v === "new" ? v : "short";
  } catch {
    return "short";
  }
}

let current: SortKey = typeof window === "undefined" ? "short" : read();

export function setSort(next: SortKey) {
  current = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* private mode: still applies for this visit */
  }
  listeners.forEach((l) => l());
}

export function useSort(): SortKey {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "short" as SortKey,
  );
}

/** Shortest run first is the original order: the one closest to breaking
 *  sits at the top. Ties fall back to the order they were created in. */
export function sortStreaks(streaks: Streak[], by: SortKey, nowMs: number): Streak[] {
  const days = (s: Streak) => currentStreakDays(s.start_date, nowMs);
  const created = (s: Streak) => Date.parse(s.created_at);
  return [...streaks].sort((a, b) => {
    if (by === "new") return created(b) - created(a);
    const diff = by === "long" ? days(b) - days(a) : days(a) - days(b);
    return diff || created(a) - created(b);
  });
}
