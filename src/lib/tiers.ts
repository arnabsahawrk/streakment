export interface Tier {
  name: string;
  color: string;
  min: number;
}

/** Colours follow how metal actually behaves under heat: the early tiers
 *  run through the incandescence sequence a smith sees as iron warms
 *  (dull red to orange to yellow to near-white). Dedicated onward
 *  switches to tempering colours - the oxides steel takes on as it
 *  hardens - matching the shift from striving to settled identity.
 *  Legend leaves steel for gold. */
export const ZERO_STATE: Tier = { name: "Day Zero", color: "#8A8578", min: 0 };

export const TIERS: Tier[] = [
  { name: "Begin", color: "#B91C1C", min: 1 },
  { name: "Commit", color: "#DC2626", min: 3 },
  { name: "Control", color: "#EA580C", min: 7 },
  { name: "Discipline", color: "#F97316", min: 15 },
  { name: "Consistent", color: "#F59E0B", min: 21 },
  { name: "Thrive", color: "#EAB308", min: 30 },
  { name: "Strong", color: "#FDE047", min: 60 },
  { name: "Dedicated", color: "#B45309", min: 90 },
  { name: "Master", color: "#3B82F6", min: 180 },
  { name: "Legend", color: "#E0A82E", min: 365 },
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
