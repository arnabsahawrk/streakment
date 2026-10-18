import test from "node:test";
import assert from "node:assert/strict";
import { safeEqual } from "../src/lib/compare";

test("constant-time compare: equal, different, different lengths, empty", () => {
  assert.equal(safeEqual("1234", "1234"), true);
  assert.equal(safeEqual("1234", "1235"), false);
  assert.equal(safeEqual("1234", "12345"), false, "different lengths must not throw");
  assert.equal(safeEqual("", ""), true);
  assert.equal(safeEqual("", "a"), false);
  assert.equal(safeEqual("pässcode", "pässcode"), true);
});
