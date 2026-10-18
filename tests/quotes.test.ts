import test from "node:test";
import assert from "node:assert/strict";
import { POOLS, pickQuote, quoteKindFor, type QuoteKind } from "../src/lib/quotes";

const kinds = Object.keys(POOLS) as QuoteKind[];

test("four pools: created, milestone, challenge_complete, legend", () => {
  assert.deepEqual(kinds.sort(), ["challenge_complete", "created", "legend", "milestone"]);
  assert.ok(POOLS.created.length >= 9);
  assert.ok(POOLS.milestone.length >= 31);
  assert.ok(POOLS.challenge_complete.length >= 8);
  assert.ok(POOLS.legend.length >= 9);
});

test("every quote has text and an attribution; no repeats inside a pool", () => {
  for (const kind of kinds) {
    const seen = new Set<string>();
    for (const q of POOLS[kind]) {
      assert.ok(q.text.trim().length > 10, `${kind}: text`);
      assert.ok(q.by.trim().length > 2, `${kind}: attribution for "${q.text}"`);
      assert.ok(q.text.length <= 260, `${kind}: short enough for an email card`);
      assert.equal(seen.has(q.text), false, `${kind}: duplicate "${q.text}"`);
      seen.add(q.text);
    }
  }
});

test("attributions are kept exactly as verified", () => {
  const by = (text: string) => kinds.flatMap((k) => POOLS[k]).find((q) => q.text === text)?.by;
  assert.equal(by("Do your duty; action is better than inaction."), "Krishna, Bhagavad Gita 3.8");
  assert.equal(by("You have the right to the work, but never to its fruit."), "Krishna, Bhagavad Gita 2.47");
  assert.equal(by("Drop by drop is the water pot filled. Likewise, the wise one, gathering it little by little, fills oneself with good."), "Buddha, Dhammapada 122");
  assert.equal(by("He who conquers others is strong; he who conquers himself is mighty."), "Lao Tzu, Tao Te Ching 33");
  assert.equal(by("Practice becomes firmly rooted when it is done for a long time, without a break, and with sincere devotion."), "Patanjali, Yoga Sutras 1.14");
  assert.equal(by("Missing once is an accident. Missing twice is the start of a new habit."), "James Clear");
  assert.equal(by("Indeed, with hardship comes ease."), "Quran 94:6");
  assert.equal(by("Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up."), "Galatians 6:9");
  assert.ok(by("We must all suffer from one of two pains: the pain of discipline or the pain of regret. The difference is discipline weighs ounces while regret weighs tons.")?.includes("Jim Rohn"));
});

test("the pools cover the traditions the owner asked for", () => {
  const all = kinds.flatMap((k) => POOLS[k]).map((q) => q.by).join(" | ");
  for (const needle of ["Bhagavad Gita", "Krishna", "Ramayana", "Dhammapada", "Tao Te Ching", "Vivekananda", "Epictetus", "Marcus Aurelius", "Confucius", "Quran", "Galatians"]) {
    assert.ok(all.includes(needle), `missing ${needle}`);
  }
});

test("the same email always gets the same quote; different emails differ", () => {
  assert.deepEqual(pickQuote("milestone", "abc:7"), pickQuote("milestone", "abc:7"));
  const picked = new Set<string>();
  for (let i = 0; i < 200; i++) picked.add(pickQuote("milestone", `streak-${i}:${i * 3}`).text);
  assert.ok(picked.size >= 20, `only ${picked.size} different quotes over 200 emails`);
  for (let i = 0; i < 50; i++) {
    const q = pickQuote("created", `s${i}`);
    assert.ok(POOLS.created.includes(q));
  }
});

test("the 365-day milestone email draws from the Legend pool", () => {
  assert.equal(quoteKindFor("milestone", 365), "legend");
  assert.equal(quoteKindFor("milestone", 180), "milestone");
  assert.equal(quoteKindFor("created", 0), "created");
  assert.equal(quoteKindFor("challenge_complete", 21), "challenge_complete");
});
