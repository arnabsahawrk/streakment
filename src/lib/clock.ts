import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DAY_MS, deviceZone, fmtClock, fmtDateTime, fmtDay, isValidZone, partsOf } from "./zone";

/** One shared clock for the whole app.
 *
 *  - A single timer ticks once a second, lined up with the real second, and
 *    stops completely while the app is hidden (no battery use in a pocket).
 *  - Components subscribe to just the slice they need: the second (clock,
 *    countdowns), the minute (sorting, summaries) or the zone. React only
 *    re-renders a component when its own slice changes, so a ticking clock
 *    never re-draws a card.
 *  - Nothing here touches the database. The two display choices (a pinned
 *    zone, 12/24-hour) live in this device's localStorage. */

interface Prefs {
  pin: string | null;
  h12: boolean;
}

const KEY = "sm.clock.v1";
const isBrowser = typeof window !== "undefined";

function readPrefs(): Prefs {
  if (!isBrowser) return { pin: null, h12: false };
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    return { pin: isValidZone(raw?.pin) ? raw.pin : null, h12: raw?.h12 === true };
  } catch {
    return { pin: null, h12: false };
  }
}

let prefs: Prefs = readPrefs();
let deviceTz = isBrowser ? deviceZone() : "";
let second = isBrowser ? Math.floor(Date.now() / 1000) : 0;
let offset = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** The current moment in ms, corrected if this device's clock is wrong. */
export function now(): number {
  return Date.now() + offset;
}

function tick() {
  const n = now();
  const s = Math.floor(n / 1000);
  const tz = deviceZone();
  let changed = false;
  if (s !== second) {
    second = s;
    changed = true;
  }
  if (tz !== deviceTz) {
    deviceTz = tz;
    changed = true;
  }
  if (changed) emit();
  // Aim just past the next whole second so the display never lags a beat.
  timer = setTimeout(tick, 1000 - (n % 1000) + 8);
}

function start() {
  clearTimeout(timer);
  tick();
}

function stop() {
  clearTimeout(timer);
}

if (isBrowser) {
  const wake = () => {
    if (listeners.size === 0) return;
    if (document.visibilityState === "hidden") stop();
    else start();
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pageshow", wake);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1 && document.visibilityState !== "hidden") start();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) stop();
  };
}

/** The server stamps every response with a Date header. If this device's
 *  clock is badly off, quietly correct for it so countdowns agree with the
 *  times saved in the database. It costs nothing: it reads a header on a
 *  request the app already makes. The header is written as the response
 *  leaves the server, so it's compared with the moment it arrives; only a
 *  gap bigger than 15 seconds counts as a wrong clock, which keeps a slow
 *  connection from ever looking like one. */
export function noteServerDate(res: Response) {
  const header = res.headers.get("date");
  if (!header) return;
  const server = Date.parse(header);
  if (Number.isNaN(server)) return;
  // The header is rounded down to the second, so centre the estimate.
  const diff = server + 500 - Date.now();
  const next = Math.abs(diff) > 15_000 ? Math.round(diff) : 0;
  if (next !== offset) {
    offset = next;
    tick();
  }
}

/** Change the on-device display choices. */
export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode: it still applies until the tab closes */
  }
  emit();
}

export const useSecond = () => useSyncExternalStore(subscribe, () => second, () => 0);
export const useMinute = () => useSyncExternalStore(subscribe, () => Math.floor(second / 60), () => 0);
/** The zone everything is shown in: the pinned one, else the device's. */
export const useZone = () => useSyncExternalStore(subscribe, () => prefs.pin || deviceTz, () => "");
export const useDeviceZone = () => useSyncExternalStore(subscribe, () => deviceTz, () => "");
export const usePin = () => useSyncExternalStore(subscribe, () => prefs.pin, () => null);
export const useHour12 = () => useSyncExternalStore(subscribe, () => prefs.h12, () => false);

type When = string | number | Date;
const toMs = (d: When) => (typeof d === "number" ? d : new Date(d).getTime());

/** Date and time formatters bound to the live zone and clock style. A
 *  component that uses these redraws by itself when the zone changes. */
export function useDisplay() {
  const tz = useZone() || "UTC";
  const h12 = useHour12();
  return useMemo(
    () => ({
      tz,
      h12,
      date: (d: When) => fmtDay(toMs(d), tz),
      dateTime: (d: When) => fmtDateTime(toMs(d), tz, h12),
      time: (d: When) => fmtClock(partsOf(toMs(d), tz), h12, false),
    }),
    [tz, h12],
  );
}

/** A moment that moves forward exactly when this streak's day count
 *  changes (and when the app returns from the background), so a card
 *  left open overnight flips to the new day on its own. */
export function useDayClock(start: string | null): number {
  const [t, setT] = useState(() => now());
  useEffect(() => {
    if (!start) return;
    const startMs = Date.parse(start);
    if (Number.isNaN(startMs)) return;
    let timeout: ReturnType<typeof setTimeout>;
    const arm = () => {
      const into = (((now() - startMs) % DAY_MS) + DAY_MS) % DAY_MS;
      timeout = setTimeout(() => {
        setT(now());
        arm();
      }, DAY_MS - into + 60);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timeout);
      setT(now());
      arm();
    };
    setT(now());
    arm();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [start]);
  return t;
}
