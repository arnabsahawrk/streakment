/** The one line an email carries. Real quotes from real people, not
 *  something written to sound motivating. Each email picks one, and always
 *  the same one for the same email, so a retry never changes it and
 *  different emails get different quotes. Add or swap your own favourites
 *  here: `by` is optional and shown under the quote. */
export interface Quote {
  text: string;
  by?: string;
}

/** When something new is started. */
const BEGIN: Quote[] = [
  { text: "A journey of a thousand miles begins with a single step.", by: "Lao Tzu" },
  { text: "Well begun is half done.", by: "Proverb" },
  { text: "Rome wasn't built in a day.", by: "Proverb" },
  { text: "Little strokes fell great oaks.", by: "Benjamin Franklin" },
];

/** At every milestone along the way. */
const KEEP_GOING: Quote[] = [
  { text: "It does not matter how slowly you go as long as you do not stop.", by: "Confucius" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", by: "Will Durant" },
  { text: "Don't count the days, make the days count.", by: "Muhammad Ali" },
  { text: "Discipline is the bridge between goals and accomplishment.", by: "Jim Rohn" },
  { text: "Missing once is an accident. Missing twice is the start of a new habit.", by: "James Clear" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", by: "Jim Ryun" },
  { text: "He who has a why to live can bear almost any how.", by: "Friedrich Nietzsche" },
  { text: "He who conquers himself is the mightiest warrior.", by: "Confucius" },
  { text: "Fall seven times, stand up eight.", by: "Japanese proverb" },
  { text: "Slow and steady wins the race.", by: "Aesop" },
];

/** When a challenge is finished. */
const FINISHED: Quote[] = [
  { text: "Well done is better than well said.", by: "Benjamin Franklin" },
  { text: "It is not the mountain we conquer, but ourselves.", by: "Edmund Hillary" },
  { text: "Do the thing, and you shall have the power.", by: "Ralph Waldo Emerson" },
];

export type QuoteKind = "created" | "milestone" | "challenge_complete";

const POOLS: Record<QuoteKind, Quote[]> = {
  created: BEGIN,
  milestone: KEEP_GOING,
  challenge_complete: FINISHED,
};

/** A small, stable hash (FNV-1a) so the same email always gets the same quote. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickQuote(kind: QuoteKind, seed: string): Quote {
  const pool = POOLS[kind];
  return pool[hash(`${kind}:${seed}`) % pool.length];
}
