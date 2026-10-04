/** How many times the app has been opened on this device. Kept in this
 *  device's localStorage - no database row, no cost on the free plan. */

const KEY = "sm.opens.v1";
/** Coming back after this long away counts as opening it again. */
const AWAY_MS = 30 * 60 * 1000;

export interface Opens {
  count: number;
  last: number | null;
}

export function readOpens(): Opens {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    return {
      count: Number.isFinite(raw?.count) ? raw.count : 0,
      last: Number.isFinite(raw?.last) ? raw.last : null,
    };
  } catch {
    return { count: 0, last: null };
  }
}

function bump() {
  try {
    const o = readOpens();
    window.localStorage.setItem(KEY, JSON.stringify({ count: o.count + 1, last: Date.now() }));
  } catch {
    /* storage unavailable: skip silently */
  }
}

let counted = false;

/** Call once from the dashboard. Counts this visit, and each return after a
 *  long absence; returns the cleanup. */
export function trackOpens(): () => void {
  if (!counted) {
    counted = true;
    bump();
  }
  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else {
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) bump();
      hiddenAt = 0;
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}
