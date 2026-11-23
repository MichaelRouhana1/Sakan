import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";

const root = path.resolve(import.meta.dirname, "..");
const bundle = await build({
  entryPoints: [path.join(root, "features/listings/recentlyViewed.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const {
  RECENTLY_VIEWED_LIMIT,
  parseRecentlyViewed,
  prependRecentlyViewed,
  visibleRecentlyViewedIds,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].contents).toString("base64")
);

test("caps at 12, deduplicates, and keeps newest first", () => {
  assert.equal(RECENTLY_VIEWED_LIMIT, 12);
  let entries = [];
  for (let i = 1; i <= 15; i++) {
    entries = prependRecentlyViewed(entries, `listing-${i}`, 1000 + i);
  }
  assert.equal(entries.length, 12);
  assert.equal(entries[0].id, "listing-15");
  assert.equal(entries[11].id, "listing-4");

  // Re-viewing an older item moves it to index 0 without increasing length
  entries = prependRecentlyViewed(entries, "listing-6", 2000);
  assert.equal(entries.length, 12);
  assert.equal(entries[0].id, "listing-6");
  assert.equal(entries.filter((e) => e.id === "listing-6").length, 1);
});

test("visibleRecentlyViewedIds excludes the active listing", () => {
  const entries = [
    { id: "a", viewedAt: 3 },
    { id: "b", viewedAt: 2 },
    { id: "c", viewedAt: 1 },
  ];
  assert.deepEqual(visibleRecentlyViewedIds(entries, "a"), ["b", "c"]);
  assert.deepEqual(visibleRecentlyViewedIds(entries, "z"), ["a", "b", "c"]);
});

test("parseRecentlyViewed recovers cleanly from malformed or duplicate storage", () => {
  for (const raw of [null, "", "{bad", "{}", "[]", JSON.stringify({ items: [null, 42, { id: "" }] })]) {
    assert.deepEqual(parseRecentlyViewed(raw), []);
  }
  const duped = JSON.stringify({
    version: 1,
    items: [
      { id: "id-1", viewedAt: 100 },
      { id: "id-1", viewedAt: 50 },
      { id: "id-2", viewedAt: "invalid" },
    ],
  });
  assert.deepEqual(parseRecentlyViewed(duped), [
    { id: "id-1", viewedAt: 100 },
    { id: "id-2", viewedAt: 0 },
  ]);
});
