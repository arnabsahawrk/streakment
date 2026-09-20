export interface Tier {
  name: string;
  line: string;
  color: string;
  min: number;
}

/** Colours follow how metal actually behaves under heat: the early tiers
 *  run through the incandescence sequence a smith sees as iron warms
 *  (dull red to orange to yellow to near-white), matching the struggle in
 *  those lines. Dedicated onward switches to tempering colours - the
 *  oxides steel takes on as it hardens - matching the shift from striving
 *  to settled identity. Legend leaves steel for gold. */
export const ZERO_STATE: Tier = {
  name: "Day Zero",
  line: "I can do this all day.",
  color: "#8A8578",
  min: 0,
};

export const TIERS: Tier[] = [
  { name: "Begin", line: "I decided to change.", color: "#B91C1C", min: 1 },
  { name: "Commit", line: "I chose the better path.", color: "#DC2626", min: 3 },
  { name: "Control", line: "I am learning to control myself.", color: "#EA580C", min: 7 },
  { name: "Discipline", line: "I am building a new me.", color: "#F97316", min: 15 },
  { name: "Consistent", line: "This is becoming who I am.", color: "#F59E0B", min: 21 },
  { name: "Thrive", line: "My old habits are losing their hold.", color: "#EAB308", min: 30 },
  { name: "Strong", line: "I am no longer who I used to be.", color: "#FDE047", min: 60 },
  { name: "Dedicated", line: "I live by my streakment.", color: "#B45309", min: 90 },
  { name: "Master", line: "Discipline has become part of me.", color: "#3B82F6", min: 180 },
  { name: "Legend", line: "I became the person I promised to become.", color: "#E0A82E", min: 365 },
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
