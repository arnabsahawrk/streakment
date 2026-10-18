import test from "node:test";
import assert from "node:assert/strict";
import { FOIL_PAINT, GOLD, LEGEND_TIER, NEUTRAL_PAINT, TIERS, ZERO_STATE, getTier, nextTier, tierIndex } from "../src/lib/tiers";
import { contrast, deltaE, hue } from "./helpers";

const CARD = "#1C1815";
const APP = "#14110E";

test("ten milestones with the agreed names and days", () => {
  assert.deepEqual(
    TIERS.map((t) => [t.name, t.min]),
    [["Begin", 1], ["Commit", 3], ["Control", 7], ["Discipline", 15], ["Consistent", 21], ["Thrive", 30], ["Strong", 60], ["Dedicated", 90], ["Master", 180], ["Legend", 365]],
  );
  assert.equal(getTier(0), ZERO_STATE);
  assert.equal(getTier(1).name, "Begin");
  assert.equal(getTier(364).name, "Master");
  assert.equal(getTier(365), LEGEND_TIER);
  assert.equal(getTier(2000), LEGEND_TIER);
  assert.equal(nextTier(0)?.name, "Begin");
  assert.equal(nextTier(365), null);
  assert.equal(tierIndex("Master"), 8);
  assert.equal(tierIndex("nope"), -1);
});

test("milestones 1 to 9 are real gradients; Legend is the only foil", () => {
  for (const t of TIERS.slice(0, 9)) {
    assert.notEqual(t.from, t.to, `${t.name} is a gradient, not a flat fill`);
    assert.ok(t.css.includes(t.from) && t.css.includes(t.to), `${t.name} css uses its stops`);
    assert.equal(t.stops.length, 2);
    assert.equal(t.foil, false);
    assert.equal(t.glow, `${t.solid}2E`);
    assert.equal(t.color, t.solid);
  }
  assert.equal(LEGEND_TIER.foil, true);
  assert.equal(FOIL_PAINT.stops.length, 5);
  assert.equal(FOIL_PAINT.css, "linear-gradient(120deg, #FFE9A8 0%, #FFC233 28%, #FF8AD0 58%, #A58BFF 80%, #5DE2FF 100%)");
  assert.equal(FOIL_PAINT.glow, "#FFC23340");
  assert.equal(GOLD, "#FFC233");
  assert.equal(TIERS.filter((t) => t.foil).length, 1);
  assert.equal(NEUTRAL_PAINT.solid, "#8A8578");
});

test("colours follow the break risk: hot crimson first, cooling to violet", () => {
  // Hue climbs red, red-orange, orange, amber, lime, green, teal, blue, violet.
  const hues = TIERS.slice(0, 9).map((t) => {
    const h = hue(t.solid);
    return h > 300 ? h - 360 : h;
  });
  for (let i = 1; i < hues.length; i++) assert.ok(hues[i] > hues[i - 1], `${TIERS[i].name} is cooler than ${TIERS[i - 1].name}`);
  assert.ok(hues[0] < 0 || hues[0] > 340, "Begin is crimson");
});

test("every solid reads on the dark card (4.5:1 or better)", () => {
  for (const t of [...TIERS, ZERO_STATE]) {
    assert.ok(contrast(t.solid, CARD) >= 4.5, `${t.name} ${t.solid} on card: ${contrast(t.solid, CARD).toFixed(2)}`);
    assert.ok(contrast(t.solid, APP) >= 4.5, `${t.name} ${t.solid} on app: ${contrast(t.solid, APP).toFixed(2)}`);
  }
});

test("neighbouring milestones are clearly different (OKLab distance)", () => {
  const solids = [...TIERS.map((t) => [t.name, t.solid] as const), ["Day Zero", ZERO_STATE.solid] as const];
  let closest = { d: Infinity, pair: "" };
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const d = deltaE(solids[i][1], solids[j][1]);
      if (d < closest.d) closest = { d, pair: `${solids[i][0]} / ${solids[j][0]}` };
    }
  }
  assert.ok(closest.d >= 0.08, `closest pair ${closest.pair}: ${closest.d.toFixed(3)}`);
});
