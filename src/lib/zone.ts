/** Time-zone maths that behaves the same on the server and in every browser
 *  this app supports (Safari 12 and up). It only relies on
 *  Intl.DateTimeFormat + formatToParts and rebuilds the text by hand, so the
 *  "24:00" midnight quirk and device-locale differences can never leak in. */

export const DAY_MS = 86_400_000;

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const cache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    cache.set(tz, f);
  }
  return f;
}

export interface Parts {
  y: number;
  m: number; // 1-12
  d: number;
  h: number; // 0-23
  mi: number;
  s: number;
  wd: number; // 0 = Sunday
}

/** The wall-clock reading in `tz` at the instant `ms`. */
export function partsOf(ms: number, tz: string): Parts {
  const p: Parts = { y: 1970, m: 1, d: 1, h: 0, mi: 0, s: 0, wd: 0 };
  for (const part of formatterFor(tz).formatToParts(new Date(ms))) {
    const v = parseInt(part.value, 10);
    switch (part.type) {
      case "year": p.y = v; break;
      case "month": p.m = v; break;
      case "day": p.d = v; break;
      case "hour": p.h = v % 24; break;
      case "minute": p.mi = v; break;
      case "second": p.s = v; break;
    }
  }
  p.wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return p;
}

export function isValidZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone this device is in right now. Re-created on every call on
 *  purpose: a cached formatter would keep reporting the old zone after the
 *  phone crosses a border. */
export function deviceZone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Always the 24-hour clock: "21:32" or, with seconds, "21:32:47". */
export function fmtClock(p: Parts, seconds: boolean): string {
  return `${pad2(p.h)}:${pad2(p.mi)}${seconds ? `:${pad2(p.s)}` : ""}`;
}

/** "Oct 3, 2026" */
export function fmtDay(ms: number, tz: string): string {
  const p = partsOf(ms, tz);
  return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Sat, Oct 3, 2026" */
export function fmtDayWd(ms: number, tz: string): string {
  const p = partsOf(ms, tz);
  return `${WEEKDAYS[p.wd]}, ${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Oct 3, 2026, 21:32" - or "Oct 3, 2026, 21:32:47" with seconds. */
export function fmtDateTime(ms: number, tz: string, seconds = false): string {
  const p = partsOf(ms, tz);
  return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}, ${fmtClock(p, seconds)}`;
}

/** Shows a zone the way the live line does: "Asia/Dhaka", but only the city
 *  for the long three-part names ("Buenos Aires"). */
export function zoneLabel(tz: string): string {
  if (!tz) return "";
  const parts = tz.split("/");
  let label = tz;
  if (parts[0] === "Etc" && parts.length > 1) label = parts.slice(1).join("/");
  else if (parts.length >= 3) label = parts[parts.length - 1];
  return label.replace(/_/g, " ");
}

/** "2d 05:12:09" / "11:27:13" - a live countdown. */
export function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ""}${pad2(h)}:${pad2(m)}:${pad2(t % 60)}`;
}
