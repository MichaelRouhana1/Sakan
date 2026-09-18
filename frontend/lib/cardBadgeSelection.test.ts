/** Run from frontend: ../backend/node_modules/.bin/tsx lib/cardBadgeSelection.test.ts */
import { strict as assert } from "node:assert";
import { applyCardBadgeDrop, GRID_TAG_LIMIT, normalizeCardBadgeSelection } from "./cardBadgeSelection";

const original = ["a", "b", "c", "d", "e", "f"];
assert.equal(GRID_TAG_LIMIT, 6);
assert.deepEqual(applyCardBadgeDrop([], "a", { zone: "card", index: 0 }).keys, ["a"]);
assert.deepEqual(applyCardBadgeDrop(["a", "c"], "b", { zone: "card", index: 1 }).keys, ["a", "b", "c"]);
assert.deepEqual(applyCardBadgeDrop(original, "g", { zone: "card", index: 2 }), { keys: original, full: true });
assert.deepEqual(applyCardBadgeDrop(original, "f", { zone: "card", index: 0 }).keys, ["f", "a", "b", "c", "d", "e"]);
assert.deepEqual(applyCardBadgeDrop(original, "a", { zone: "card", index: 6 }).keys, ["b", "c", "d", "e", "f", "a"]);
assert.deepEqual(applyCardBadgeDrop(original, "c", { zone: "card", index: 3 }).keys, original);
assert.deepEqual(applyCardBadgeDrop(original, "c", { zone: "pool" }).keys, ["a", "b", "d", "e", "f"]);
assert.deepEqual(applyCardBadgeDrop(original, "c", null).keys, original);
assert.deepEqual(applyCardBadgeDrop(original, "g", { zone: "pool" }).keys, original);
assert.deepEqual(original, ["a", "b", "c", "d", "e", "f"], "operations must not mutate the draft");

const eligible = [...original, "g", "h"];
assert.deepEqual(normalizeCardBadgeSelection(null, eligible, eligible), original);
assert.deepEqual(normalizeCardBadgeSelection([], eligible, eligible), [], "empty stays empty");
assert.deepEqual(normalizeCardBadgeSelection(["gone", "c", "c", "a", "b", "d", "e", "f", "g"], [], eligible), ["c", "a", "b", "d", "e", "f"]);
assert.deepEqual(normalizeCardBadgeSelection(["b", "a"], [], ["a"]), ["a"], "changed facts remove ineligible badges");
assert.deepEqual(normalizeCardBadgeSelection(null, [], []), []);

// Every permitted move keeps all six badges unique and within the limit.
for (const key of original) {
  for (let index = 0; index <= original.length; index++) {
    const result = applyCardBadgeDrop(original, key, { zone: "card", index });
    assert.equal(result.full, false);
    assert.deepEqual([...result.keys].sort(), original);
  }
}
console.log("cardBadgeSelection.test.ts: 59 checks passed");
