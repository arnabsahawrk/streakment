export interface Tier {
  name: string;
  color: string;
  min: number;
}

/** One colour per milestone, each picked to suit its word and to stay
 *  clearly different from every other (checked, not eyeballed):
 *  Begin is a fresh green, Commit the flame orange the app is built on,
 *  Control a calm blue, Discipline a deep indigo, Consistent a steady cyan,
 *  Thrive a growing lime, Strong a power red, Dedicated a devoted pink,
 *  Master a royal purple, and Legend gold. */
export const ZERO_STATE: Tier = { name: "Day Zero", color: "#8A8578", min: 0 };

export const TIERS: Tier[] = [
  { name: "Begin", color: "#4ADE80", min: 1 },
  { name: "Commit", color: "#FF7A33", min: 3 },
  { name: "Control", color: "#4DA3FF", min: 7 },
  { name: "Discipline", color: "#7978FB", min: 15 },
  { name: "Consistent", color: "#22D3EE", min: 21 },
  { name: "Thrive", color: "#C6F135", min: 30 },
  { name: "Strong", color: "#FF4D5E", min: 60 },
  { name: "Dedicated", color: "#FF6FB1", min: 90 },
  { name: "Master", color: "#BE66DF", min: 180 },
  { name: "Legend", color: "#FFC233", min: 365 },
];

export function getTier(days: number): Tier {
  if (days <= 0) return ZERO_STATE;
  let current = TIERS[0];
  for (const t of TIERS) if (days >= t.min) current = t;
  return current;
}

export function nextTier(days: number): Tier | null {
  return TIERS.find((t) => t.min > days) ?? null;
}

export const LEGEND_MIN = 365;
