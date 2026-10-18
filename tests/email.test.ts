import test from "node:test";
import assert from "node:assert/strict";
import { buildStreakEmail, type EmailStreak } from "../src/lib/emailTemplate";
import { POOLS } from "../src/lib/quotes";
import { TIERS } from "../src/lib/tiers";

const START = Date.UTC(2026, 9, 1, 12, 0, 0);
const base = (extra: Partial<EmailStreak> = {}): EmailStreak => ({
  id: "11111111-2222-3333-4444-555555555555",
  name: "No mindless scrolling",
  why_note: "The regret I'm avoiding.",
  type: "legend",
  goal_days: null,
  start_date: new Date(START).toISOString(),
  max_streak: 0,
  fail_count: 0,
  ...extra,
});
const challenge = (goal = 21, extra: Partial<EmailStreak> = {}) => base({ type: "challenge", goal_days: goal, ...extra });

const ZONE = "Asia/Dhaka";
const tags = (html: string, k: string) => [...html.matchAll(new RegExp(`data-k="${k}"[^>]*>([\\s\\S]*?)</td>`, "g"))].map((m) => m[1]);

test("subject lines", () => {
  assert.equal(buildStreakEmail("created", base(), 0, ZONE).subject, "No mindless scrolling · started");
  assert.equal(buildStreakEmail("created", challenge(), 0, ZONE).subject, "No mindless scrolling · challenge started");
  assert.equal(buildStreakEmail("milestone", base(), 7, ZONE).subject, "No mindless scrolling · Control · day 7");
  assert.equal(buildStreakEmail("milestone", base(), 365, ZONE).subject, "No mindless scrolling · Legend · day 365");
  assert.equal(buildStreakEmail("challenge_complete", challenge(), 21, ZONE).subject, "No mindless scrolling · challenge complete");
});

test("every detail is two full-width rows: the label, then its value under it", () => {
  for (const mail of [
    buildStreakEmail("created", base(), 0, ZONE),
    buildStreakEmail("created", challenge(), 0, ZONE),
    buildStreakEmail("milestone", base({ fail_count: 2, max_streak: 12 }), 7, ZONE),
    buildStreakEmail("milestone", base(), 365, ZONE),
    buildStreakEmail("challenge_complete", challenge(), 21, ZONE),
  ]) {
    const order = [...mail.html.matchAll(/data-k="(label|value)"/g)].map((m) => m[1]);
    assert.ok(order.length >= 8, "has its details");
    order.forEach((k, i) => assert.equal(k, i % 2 === 0 ? "label" : "value", "labels and values alternate, label first"));
    // each detail row holds exactly one cell: never a label and a value side by side
    for (const row of mail.html.match(/<tr><td data-k="[^"]+"[\s\S]*?<\/td><\/tr>/g) ?? []) {
      assert.equal((row.match(/<td/g) ?? []).length, 1, "one cell per row");
    }
    assert.equal(/@media/.test(mail.html), false, "layout needs no media queries");
  }
});

test("gradient text is never used (it vanishes where unsupported); gradients sit on shapes with a solid behind", () => {
  const mail = buildStreakEmail("milestone", base(), 365, ZONE);
  assert.equal(/color:\s*transparent/i.test(mail.html), false);
  assert.equal(/background-clip/i.test(mail.html), false);
  assert.equal(/text-fill-color/i.test(mail.html), false);
  const gradients = mail.html.match(/background-color:#[0-9A-Fa-f]{6};background-image:linear-gradient\([^)]*\)/g) ?? [];
  assert.ok(gradients.length >= 12, "top band, ten steps, quote bar");
});

test("the layout: dark card, 20px radius, 540 wide, preheader, wordmark, link", () => {
  const { html, preheader } = buildStreakEmail("milestone", base({ fail_count: 3, max_streak: 12 }), 7, ZONE);
  assert.ok(html.includes("background-color:#14110E"));
  assert.ok(html.includes("background-color:#1C1815;border-radius:20px"));
  assert.ok(html.includes("max-width:540px"));
  assert.ok(html.includes("table-layout:fixed"));
  assert.ok(html.includes("STREAKMENT"));
  assert.ok(html.includes('href="https://streakment.vercel.app"'));
  assert.ok(html.includes("Open Streakment"));
  assert.equal(preheader, "Control · day 7 · 3 failed · best 12 days");
  assert.ok(html.includes(`display:none;max-height:0;overflow:hidden;opacity:0`), "a hidden preheader");
  assert.ok(html.includes("CONTROL · DAY 7"), "the tag");
});

test("long text wraps in the card (name, unbroken link, multi-line why)", () => {
  const name = "N".repeat(80);
  const link = "https://example.com/" + "a".repeat(100);
  const why = ("Because the regret is real. " + link + "\n").repeat(6).slice(0, 800);
  const { html, text } = buildStreakEmail("milestone", base({ name, why_note: why }), 7, ZONE);
  assert.ok(html.includes(name));
  assert.ok(html.includes("<br>"), "line breaks kept");
  assert.ok((html.match(/word-break:break-word;overflow-wrap:anywhere/g) ?? []).length >= 4, "wrapping on the name, the why, the values");
  assert.ok(text.includes(name));
  assert.ok(why.length <= 800);
});

test("what people typed is escaped", () => {
  const { html } = buildStreakEmail("created", base({ name: "<script>alert(1)</script> & co", why_note: 'say "hi" <b>x</b>' }), 0, ZONE);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co"));
  assert.ok(html.includes("say &quot;hi&quot; &lt;b&gt;x&lt;/b&gt;"));
});

test("dates carry seconds and the zone, and are worked out from the start", () => {
  const { html, text } = buildStreakEmail("milestone", base(), 7, ZONE);
  // start: Oct 1 12:00:00 UTC = 18:00:00 in Dhaka. Day 7 = Oct 8 18:00:00. Next (Discipline, day 15) = Oct 16 18:00:00.
  assert.ok(html.includes("Oct 1, 2026, 18:00:00 · Asia/Dhaka"), "Started");
  assert.ok(html.includes("Oct 8, 2026, 18:00:00 · Asia/Dhaka"), "Reached");
  assert.ok(html.includes("Discipline · day 15"));
  assert.ok(html.includes("Oct 16, 2026, 18:00:00 · Asia/Dhaka"), "Next");
  assert.ok(/\d{2}:\d{2}:\d{2}/.test(text));
  const utc = buildStreakEmail("milestone", base(), 7, "Not/AZone");
  assert.ok(utc.html.includes("Oct 1, 2026, 12:00:00 · UTC"), "an unknown zone falls back to UTC");
});

test("details by kind", () => {
  const labels = (m: { html: string }) => tags(m.html, "label");
  assert.deepEqual(labels(buildStreakEmail("created", base(), 0, ZONE)), ["Why", "Type", "Level", "Started", "Failed", "Next"]);
  assert.deepEqual(labels(buildStreakEmail("created", challenge(), 0, ZONE)), ["Why", "Type", "Goal", "Started", "Failed", "Ends"]);
  assert.deepEqual(labels(buildStreakEmail("milestone", base({ max_streak: 12 }), 7, ZONE)), ["Why", "Type", "Level", "Started", "Reached", "Best", "Failed", "Next"]);
  assert.deepEqual(labels(buildStreakEmail("milestone", base(), 365, ZONE)), ["Why", "Type", "Level", "Started", "Reached", "Best", "Failed", "Status"]);
  assert.deepEqual(labels(buildStreakEmail("challenge_complete", challenge(), 21, ZONE)), ["Why", "Type", "Goal", "Started", "Completed", "Failed", "Status"]);
  const level = tags(buildStreakEmail("milestone", base(), 7, ZONE).html, "value")[2];
  assert.equal(level, "Control · 3 of 10");
  assert.equal(tags(buildStreakEmail("created", base(), 0, ZONE).html, "value")[2], "Day Zero · 0 of 10");
  assert.ok(tags(buildStreakEmail("milestone", base({ fail_count: 4 }), 15, ZONE).html, "value").includes("4"), "the Failed count");
  assert.equal(/Breaks|Reset/.test(buildStreakEmail("milestone", base(), 7, ZONE).html), false);
});

test("the ten-step strip: every reached step is lit; a challenge has a plain bar instead", () => {
  const lit = (html: string) => TIERS.filter((t) => html.includes(`background-color:${t.solid};background-image:linear-gradient(90deg,${t.stops[0].color} 0%`)).length;
  assert.equal(lit(buildStreakEmail("milestone", base(), 7, ZONE).html), 3 + 0, "Begin, Commit, Control");
  assert.equal(lit(buildStreakEmail("created", base(), 0, ZONE).html), 1, "only the top band wears Begin's gradient");
  assert.equal(lit(buildStreakEmail("milestone", base(), 365, ZONE).html) >= 9, true);
  const bar = buildStreakEmail("challenge_complete", challenge(21), 21, ZONE).html;
  assert.ok(bar.includes("21 / 21"));
  assert.ok(bar.includes('width="100%"'));
  assert.equal((buildStreakEmail("created", challenge(21), 0, ZONE).html.match(/>(\d+) \/ 21</g) ?? []).length, 1);
  const days = [1, 3, 7, 15, 21, 30, 60, 90, 180, 365].map((d) => `>${d}</td>`);
  for (const d of days) assert.ok(buildStreakEmail("milestone", base(), 7, ZONE).html.includes(d), `step label ${d}`);
});

test("one quote, from the right pool, the same every time", () => {
  const a = buildStreakEmail("milestone", base(), 7, ZONE);
  const b = buildStreakEmail("milestone", base(), 7, ZONE);
  assert.equal(a.html, b.html, "a retry builds the identical email");
  const all = (k: keyof typeof POOLS) => POOLS[k].map((q) => q.text.replace(/'/g, "&#39;"));
  const legend = buildStreakEmail("milestone", base(), 365, ZONE);
  const quoteOf = (html: string) => /&ldquo;([\s\S]*?)&rdquo;/.exec(html)?.[1] ?? "";
  assert.ok(POOLS.legend.some((q) => legend.html.includes(q.by) && quoteOf(legend.html).length > 0), "Legend draws from the legend pool");
  assert.ok(POOLS.created.some((q) => buildStreakEmail("created", base(), 0, ZONE).html.includes(q.by)));
  assert.equal((a.html.match(/&ldquo;/g) ?? []).length, 1, "exactly one quote");
  assert.ok(all("milestone").length > 0);
  const different = new Set<string>();
  for (let i = 0; i < 40; i++) different.add(quoteOf(buildStreakEmail("milestone", base({ id: `id-${i}` }), 7, ZONE).html));
  assert.ok(different.size > 5, "different emails get different quotes");
});

test("no greetings or motivational copy: only details and the quote", () => {
  const { text } = buildStreakEmail("milestone", base({ max_streak: 12 }), 7, ZONE);
  for (const banned of ["Hi ", "Hello", "Congrat", "Great job", "Keep going", "You've", "Well done"]) {
    assert.equal(text.includes(banned), false, `"${banned}" found`);
  }
  assert.ok(text.startsWith("STREAKMENT\nCONTROL · DAY 7\nNo mindless scrolling\n7 days"));
  assert.ok(text.includes("Open Streakment: https://streakment.vercel.app"));
  assert.equal(/<[a-z][^>]*>/i.test(text), false, "the plain copy has no HTML");
});
