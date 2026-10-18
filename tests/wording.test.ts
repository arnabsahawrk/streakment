import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx|css|sql|md)$/.test(name)) out.push(p);
  }
  return out;
}

// Everything the owner can read or run: all of src, and the schema.
const scanned = [...files(join(ROOT, "src")), join(ROOT, "schema.sql")];
const text = (p: string) => readFileSync(p, "utf8");

test("the word is Infinite: the old spelling appears nowhere", () => {
  for (const p of scanned) {
    // (the JS number `Infinity`, as in an animation's `repeat: Infinity`, is not wording)
    assert.equal(/(?<!repeat: )\b[Ii]nfinity\b/.test(text(p)), false, `${p} uses the old spelling`);
  }
});

test("Reset and Break are gone: the word is Failed", () => {
  // (a "break;" statement or a CSS "break-words" is fine: only the words as words.)
  const banned = /reset_count|reset_log|reset_at|resetNote|\/reset\b|\b[Rr]esets?\b|\bBreaks?\b|break_count|\bbreaks\b/;
  for (const p of scanned) {
    const hit = text(p).match(banned);
    assert.equal(hit, null, `${p} still says "${hit?.[0]}"`);
  }
});

test("no console.log, and no schema changes from app code", () => {
  for (const p of scanned.filter((f) => !f.endsWith(".sql"))) {
    const src = text(p);
    assert.equal(/console\.log/.test(src), false, `${p} has a console.log`);
    assert.equal(/alter\s+table/i.test(src), false, `${p} alters a table at runtime`);
    assert.equal(/information_schema/i.test(src), false, `${p} checks for columns at runtime`);
  }
});

test("schema.sql is the whole schema, idempotent, and uses the new names", () => {
  const sql = text(join(ROOT, "schema.sql"));
  for (const needle of ["fail_count", "fail_log", "failed_at", "paused_at", "stopped_at", "infinite_from", "renamed", "failed_unlocks", "locked_until", "webauthn_credentials", "webauthn_challenges"]) {
    assert.ok(sql.includes(needle), `schema.sql is missing ${needle}`);
  }
  const creates = sql.match(/create (table|index|unique index|extension)[^;]*/gi) ?? [];
  assert.ok(creates.length > 8);
  for (const c of creates) assert.ok(/if not exists/i.test(c), `not idempotent: ${c.slice(0, 60)}`);
  assert.equal(/alter\s+table/i.test(sql), false, "a fresh database needs no ALTER");
});
