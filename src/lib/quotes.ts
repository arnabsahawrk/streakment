/** The one line an email carries. Real quotes from real sources, chosen to
 *  fit this app: small beginnings, discipline, never missing twice,
 *  mastering yourself, finishing. Nothing written to sound motivating.
 *
 *  Each email picks one, and always the same one for the same email (a hash
 *  of the streakment and the day), so a retry never changes it and
 *  different emails get different quotes. Add or swap your own favourites
 *  here. `by` is shown under the quote. */
export interface Quote {
  text: string;
  by: string;
}

/** When a streakment starts: small beginnings. */
const CREATED: Quote[] = [
  { text: "A journey of a thousand miles begins with a single step.", by: "Lao Tzu" },
  { text: "A tree as big as a man's embrace springs from a tiny shoot; a tower nine stories high begins with a heap of earth.", by: "Lao Tzu, Tao Te Ching 64" },
  { text: "Drop by drop is the water pot filled. Likewise, the wise one, gathering it little by little, fills oneself with good.", by: "Buddha, Dhammapada 122" },
  { text: "Do your duty; action is better than inaction.", by: "Krishna, Bhagavad Gita 3.8" },
  { text: "Take up one idea. Make that one idea your life.", by: "Swami Vivekananda" },
  { text: "First say to yourself what you would be; and then do what you have to do.", by: "Epictetus" },
  { text: "Every action you take is a vote for the type of person you wish to become.", by: "James Clear" },
  { text: "Little strokes fell great oaks.", by: "Benjamin Franklin" },
  { text: "Well begun is half done.", by: "Proverb" },
];

/** At each milestone: keep going, never miss twice. */
const MILESTONE: Quote[] = [
  { text: "The mind is restless and hard to control, but it is brought under control by practice and detachment.", by: "Krishna, Bhagavad Gita 6.35" },
  { text: "You have the right to the work, but never to its fruit.", by: "Krishna, Bhagavad Gita 2.47" },
  { text: "Pleasure and pain come and go. They do not last; learn to endure them.", by: "Krishna, Bhagavad Gita 2.14" },
  { text: "Be steady in success and in failure. That evenness of mind is yoga.", by: "Krishna, Bhagavad Gita 2.48" },
  { text: "Practice becomes firmly rooted when it is done for a long time, without a break, and with sincere devotion.", by: "Patanjali, Yoga Sutras 1.14" },
  { text: "As a smith removes impurities from silver, little by little, moment by moment, so should the wise remove their own.", by: "Buddha, Dhammapada 239" },
  { text: "You yourself must make the effort. The Buddhas only point the way.", by: "Buddha, Dhammapada 276" },
  { text: "One is one's own refuge. Who else could it be?", by: "Buddha, Dhammapada 160" },
  { text: "Be as careful at the end as at the beginning, and there will be no failure.", by: "Lao Tzu, Tao Te Ching 64" },
  { text: "It does not matter how slowly you go as long as you do not stop.", by: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", by: "Confucius" },
  { text: "Enthusiasm is the greatest strength; nothing is out of reach for the one who has it.", by: "Valmiki Ramayana" },
  { text: "Rama does not go back on his word.", by: "Valmiki Ramayana" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", by: "Marcus Aurelius" },
  { text: "No man is free who is not master of himself.", by: "Epictetus" },
  { text: "If one does not know to which port one is sailing, no wind is favorable.", by: "Seneca" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", by: "Will Durant" },
  { text: "We must all suffer from one of two pains: the pain of discipline or the pain of regret. The difference is discipline weighs ounces while regret weighs tons.", by: "Jim Rohn" },
  { text: "Discipline is the bridge between goals and accomplishment.", by: "Jim Rohn" },
  { text: "Missing once is an accident. Missing twice is the start of a new habit.", by: "James Clear" },
  { text: "Habits are the compound interest of self-improvement.", by: "James Clear" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", by: "Jim Ryun" },
  { text: "Don't count the days, make the days count.", by: "Muhammad Ali" },
  { text: "He who has a why to live can bear almost any how.", by: "Friedrich Nietzsche" },
  { text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.", by: "Prophet Muhammad, Sahih al-Bukhari" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", by: "Galatians 6:9" },
  { text: "For though the righteous fall seven times, they rise again.", by: "Proverbs 24:16" },
  { text: "Fall seven times, stand up eight.", by: "Japanese proverb" },
  { text: "Let me not pray to be sheltered from dangers, but to be fearless in facing them.", by: "Rabindranath Tagore" },
  { text: "When we are no longer able to change a situation, we are challenged to change ourselves.", by: "Viktor Frankl" },
  { text: "Slow and steady wins the race.", by: "Aesop" },
];

/** When a challenge is completed: conquering yourself. */
const CHALLENGE_COMPLETE: Quote[] = [
  { text: "Though one conquer a thousand times a thousand men in battle, he who conquers himself is the greatest of conquerors.", by: "Buddha, Dhammapada 103" },
  { text: "He who conquers others is strong; he who conquers himself is mighty.", by: "Lao Tzu, Tao Te Ching 33" },
  { text: "Let a man lift himself by his own self, and not lower himself; for the self alone is the friend of the self.", by: "Krishna, Bhagavad Gita 6.5" },
  { text: "Arise, awake, and stop not till the goal is reached.", by: "Swami Vivekananda" },
  { text: "Well done is better than well said.", by: "Benjamin Franklin" },
  { text: "It is not the mountain we conquer, but ourselves.", by: "Edmund Hillary" },
  { text: "Do the thing, and you shall have the power.", by: "Ralph Waldo Emerson" },
  { text: "Indeed, with hardship comes ease.", by: "Quran 94:6" },
];

/** Day 365: mastery of the self. */
const LEGEND: Quote[] = [
  { text: "He who conquers himself is the mightiest warrior.", by: "Confucius" },
  { text: "All power is within you; you can do anything and everything.", by: "Swami Vivekananda" },
  { text: "Arise, awake, and stop not till the goal is reached.", by: "Swami Vivekananda" },
  { text: "No man is free who is not master of himself.", by: "Epictetus" },
  { text: "Practice becomes firmly rooted when it is done for a long time, without a break, and with sincere devotion.", by: "Patanjali, Yoga Sutras 1.14" },
  { text: "Though one conquer a thousand times a thousand men in battle, he who conquers himself is the greatest of conquerors.", by: "Buddha, Dhammapada 103" },
  { text: "Let a man lift himself by his own self, and not lower himself; for the self alone is the friend of the self.", by: "Krishna, Bhagavad Gita 6.5" },
  { text: "He who conquers others is strong; he who conquers himself is mighty.", by: "Lao Tzu, Tao Te Ching 33" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", by: "Will Durant" },
];

export type EmailKind = "created" | "milestone" | "challenge_complete";
export type QuoteKind = EmailKind | "legend";

export const POOLS: Record<QuoteKind, Quote[]> = {
  created: CREATED,
  milestone: MILESTONE,
  challenge_complete: CHALLENGE_COMPLETE,
  legend: LEGEND,
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

/** The 365-day milestone email draws from the Legend pool. */
export function quoteKindFor(email: EmailKind, day: number): QuoteKind {
  return email === "milestone" && day >= 365 ? "legend" : email;
}
