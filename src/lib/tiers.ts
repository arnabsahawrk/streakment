/** One stop along a gradient. `at` is 0 to 100 (percent along it). */
export interface Stop {
  at: number;
  color: string;
}

/** Everything needed to paint something in one milestone's colours. */
export interface Paint {
  /** A solid stand-in: small text on dark, email backgrounds, anywhere a
   *  gradient can't go. At least 4.5:1 against the card (#1C1815). */
  solid: string;
  from: string;
  to: string;
  /** For an SVG <linearGradient>. */
  stops: readonly Stop[];
  /** A CSS `background` / `background-image` value. */
  css: string;
  /** Glow and tint colour: the solid at about 18%, or the foil's gold. */
  glow: string;
  /** The prismatic foil. Only this one may shimmer. */
  foil: boolean;
}

export interface Tier extends Paint {
  name: string;
  /** The first day this milestone counts. */
  min: number;
  /** The solid colour (the name older code used). */
  color: string;
}

export const GOLD = "#FFC233";

function gradient(from: string, solid: string, to: string): Paint {
  return {
    solid,
    from,
    to,
    stops: [
      { at: 0, color: from },
      { at: 100, color: to },
    ],
    css: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    glow: `${solid}2E`,
    foil: false,
  };
}

/** Legend: a prismatic gold foil. Nothing else uses it, and it holds every
 *  colour, because every stage has been passed. */
export const FOIL_PAINT: Paint = {
  solid: "#FFE49A",
  from: "#FFE9A8",
  to: "#5DE2FF",
  stops: [
    { at: 0, color: "#FFE9A8" },
    { at: 28, color: "#FFC233" },
    { at: 58, color: "#FF8AD0" },
    { at: 80, color: "#A58BFF" },
    { at: 100, color: "#5DE2FF" },
  ],
  css: "linear-gradient(120deg, #FFE9A8 0%, #FFC233 28%, #FF8AD0 58%, #A58BFF 80%, #5DE2FF 100%)",
  glow: "#FFC23340",
  foil: true,
};

/** Day Zero and paused: neutral grey. */
export const NEUTRAL_PAINT: Paint = {
  ...gradient("#6F6A5F", "#8A8578", "#A39D8F"),
};
export const NEUTRAL = NEUTRAL_PAINT.solid;

export const ZERO_STATE: Tier = { name: "Day Zero", min: 0, color: NEUTRAL_PAINT.solid, ...NEUTRAL_PAINT };

/** The ten milestones. The colours follow how likely a streak is to break at
 *  that stage: the first days are the most fragile, so they are hot
 *  (crimson), then it cools as the habit settles: red, orange, amber, lime,
 *  green, teal, blue, violet. Legend is the foil. */
function tier(name: string, min: number, from: string, solid: string, to: string): Tier {
  return { name, min, color: solid, ...gradient(from, solid, to) };
}

export const TIERS: Tier[] = [
  tier("Begin", 1, "#D91E36", "#F43557", "#FF5A6E"),
  tier("Commit", 3, "#EE3F14", "#FA5A22", "#FF7F3A"),
  tier("Control", 7, "#F2790A", "#FF8E12", "#FFAE3D"),
  tier("Discipline", 15, "#EFA400", "#FBBC05", "#FFD43B"),
  tier("Consistent", 21, "#C3D01A", "#D2E01F", "#E6F25A"),
  tier("Thrive", 30, "#22B04A", "#3DD16B", "#6BE595"),
  tier("Strong", 60, "#0FB09C", "#1ECDB8", "#45E6D6"),
  tier("Dedicated", 90, "#2A7FFF", "#4A9BFF", "#7BBDFF"),
  tier("Master", 180, "#6F4EFF", "#9468FF", "#B88BFF"),
  { name: "Legend", min: 365, color: FOIL_PAINT.solid, ...FOIL_PAINT },
];

export const LEGEND_MIN = 365;
export const LEGEND_TIER: Tier = TIERS[TIERS.length - 1];

/** The milestone a streak is on after `days` days. Day 0 is Day Zero. */
export function getTier(days: number): Tier {
  if (days <= 0) return ZERO_STATE;
  let current = TIERS[0];
  for (const t of TIERS) if (days >= t.min) current = t;
  return current;
}

export function nextTier(days: number): Tier | null {
  return TIERS.find((t) => t.min > days) ?? null;
}

/** 0 to 9 for a milestone name, -1 for anything else. */
export function tierIndex(name: string): number {
  return TIERS.findIndex((t) => t.name === name);
}
