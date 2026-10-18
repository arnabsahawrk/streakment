import { useSyncExternalStore } from "react";
import { daysOf, isCompleted, isStopped, type RuleRow } from "./streak";
import type { Streak } from "./types";

/** How the streakments are ordered. A display choice, so it lives in this
 *  device's localStorage and costs the database nothing. */
export type SortKey = "short" | "long" | "new";

export const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "short", label: "Shortest" },
  { key: "long", label: "Longest" },
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

type Sortable = RuleRow & { created_at: string };

/** Completed ones always come first, in all three orders. After that:
 *  Shortest puts the run closest to breaking at the top, Longest the
 *  opposite, Newest the latest one made. Ties fall back to the order they
 *  were created in. */
export function sortStreaks<T extends Sortable = Streak>(streaks: T[], by: SortKey, nowMs: number): T[] {
  const days = (s: T) => daysOf(s, nowMs);
  const created = (s: T) => Date.parse(s.created_at);
  const done = (s: T) => (isCompleted(s, nowMs) ? 0 : 1);
  return [...streaks].sort((a, b) => {
    const first = done(a) - done(b);
    if (first) return first;
    if (by === "new") return created(b) - created(a);
    const diff = by === "long" ? days(b) - days(a) : days(a) - days(b);
    return diff || created(a) - created(b);
  });
}

/** The Infinite view: the ones still counting first (longest first), the
 *  stopped ones after (longest first). */
export function sortInfinite<T extends Sortable = Streak>(streaks: T[], nowMs: number): T[] {
  const stopped = (s: T) => (isStopped(s) ? 1 : 0);
  return [...streaks].sort((a, b) => {
    const first = stopped(a) - stopped(b);
    if (first) return first;
    return daysOf(b, nowMs) - daysOf(a, nowMs) || Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}
