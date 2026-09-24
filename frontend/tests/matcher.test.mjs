import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundle = await build({
  stdin: {
    contents: `export * from './features/matcher/scoring'; export * from './features/matcher/preferences'; export * from './features/matcher/browseState'; export * from './features/listings/normalizeListing'; export * from './lib/browseFilters';`,
    resolveDir: frontend,
    loader: "ts",
  },
  absWorkingDir: frontend,
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const m = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`
);
const row = (id, overrides = {}) =>
  m.normalizeListing({
    id,
    status: "active",
    listing_type: "studio",
    monthly_rent_usd: 500,
    area: "Hamra",
    electricity: "solar",
    wifi_included: true,
    gender_restriction: "girls_only",
    lat: 33.9,
    lng: 35.48,
    price_basis: "per_unit_month",
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  });
const pref = (value, importance = "prefer") => ({ value, importance });
const all = {
  version: 1,
  type: pref(["studio"]),
  budget: pref({ min: null, max: 500 }),
  location: pref({
    kind: "campus",
    label: "LAU",
    campusId: "lau",
    slug: "lau-beirut",
    center: { lat: 33.9, lng: 35.48 },
  }),
  gender: pref(["girls_only"], "required"),
  power: pref(["solar"]),
  wifi: pref(true),
};

test("missing fields never inherit legacy solar, Wi-Fi, or unrestricted-gender defaults as evidence", () => {
  const l = m.normalizeListing({ id: "missing" });
  assert.equal(l.electricity, "solar");
  assert.equal(l.wifiIncluded, true);
  assert.equal(l.matchFacts.power, null);
  assert.equal(l.matchFacts.wifi, null);
  assert.equal(l.matchFacts.gender, null);
  const r = m.rankListings([l], {
    version: 1,
    power: pref(["solar"]),
    wifi: pref(true),
  });
  assert.equal(r.listings.length, 1);
  assert.equal(r.matches.missing.score, 0);
  assert.equal(r.matches.missing.top, false);
  assert.deepEqual(r.matches.missing.reasons, []);
  assert.equal(row("false", { wifi_included: false }).matchFacts.wifi, false);
  assert.equal(row("str", { wifi_included: "true" }).matchFacts.wifi, null);
  assert.equal(row("zero", { monthly_rent_usd: 0 }).matchFacts.rent, null);
  assert.deepEqual(l.matchFacts.reportedUtilityKeys, []);
});
test("weights, budget boundaries and skipped dimensions use an honest denominator", () => {
  const p = {
    version: 1,
    budget: pref({ min: 300, max: 500 }),
    power: pref(["solar"]),
  };
  const r = m.rankListings(
    [
      row("within"),
      row("over", { monthly_rent_usd: 550 }),
      row("far", { monthly_rent_usd: 600 }),
      row("unknown", { monthly_rent_usd: null }),
    ],
    p,
  );
  assert.equal(r.matches.within.score, 100);
  assert.equal(r.matches.over.score, 62.5);
  assert.equal(r.matches.far.score, 25);
  assert.equal(r.matches.unknown.score, 25);
  assert.equal(r.matches.over.answeredCount, 2);
  assert.ok(!r.matches.over.reasons.includes("Within budget"));
  assert.match(r.matches.over.details[0].description, /over/);
  assert.deepEqual(m.rankListings([row("plain")], { version: 1 }).matches, {});
});
test("hard filters never widen; unknown required facts exclude while unknown preferences remain", () => {
  const p = { version: 1, power: pref(["solar"], "required") };
  const items = [
    row("good"),
    row("bad", { electricity: "scheduled_cuts" }),
    row("unknown", { electricity: null }),
  ];
  assert.deepEqual(
    m.rankListings(items, p).listings.map((l) => l.id),
    ["good"],
  );
  assert.equal(
    m.rankListings(items, { ...p, power: pref(["solar"]) }).listings.length,
    3,
  );
  const gender = { version: 1, gender: pref(["girls_only"], "prefer") };
  assert.equal(
    m.rankListings([row("any", { gender_restriction: "anyone" })], gender)
      .listings.length,
    0,
  );
});
test("best result from end of payload outranks sponsorship and ties use recency then ID", () => {
  const items = [
    row("boost", { monthly_rent_usd: 600, boosted_until: "2099-01-01" }),
    row("b", { created_at: "2026-09-02" }),
    row("a", { created_at: "2026-09-02" }),
    row("c"),
    row("best"),
  ];
  const r = m.rankListings(items, {
    version: 1,
    budget: pref({ min: null, max: 500 }),
  });
  assert.deepEqual(
    r.listings.map((l) => l.id),
    ["a", "b", "best", "c", "boost"],
  );
  assert.equal(Object.values(r.matches).filter((x) => x.top).length, 3);
});
test("campus and area distances are computed only from valid coordinates", () => {
  const p = { version: 1, location: all.location };
  const r = m.rankListings(
    [row("near"), row("far", { lat: 34.2 }), row("unknown", { lat: null })],
    p,
  );
  assert.equal(r.matches.near.score, 100);
  assert.equal(r.matches.far.score, 0);
  assert.equal(r.matches.unknown.knownCount, 0);
  assert.match(r.matches.near.reasons[0], /Within 2 km/);
  const area = {
    version: 1,
    location: pref({
      kind: "area",
      label: "Hamra",
      areas: ["Hamra"],
      center: { lat: 33.9, lng: 35.48 },
    }),
  };
  const a = m.rankListings(
    [
      row("exact", { lat: null }),
      row("next", { area: "Verdun" }),
      row("none", { area: "Verdun", lat: null }),
    ],
    area,
  );
  assert.equal(a.matches.exact.score, 100);
  assert.equal(a.matches.next.score, 50);
  assert.equal(a.matches.none.score, 0);
});
test("widen ladder stops at three and never mutates scores or listing membership", () => {
  const items = [
    row("a"),
    row("b", { monthly_rent_usd: 525 }),
    row("c", { monthly_rent_usd: 550 }),
  ];
  const prefs = { version: 1, budget: pref({ min: null, max: 500 }) };
  const before = m.rankListings(items, prefs);
  const explanation = m.explainWidening(before.listings, prefs);
  assert.equal(explanation.strictCount, 1);
  assert.equal(explanation.alternativeCount, 3);
  assert.equal(explanation.labels.length, 1);
  assert.deepEqual(m.rankListings(items, prefs), before);
  assert.deepEqual(
    m.explainWidening([items[0]], {
      version: 1,
      budget: pref({ min: null, max: 500 }, "required"),
    }).labels,
    [],
  );
});
test("widening covers every step, skips missing centers, and never treats unknowns as confirmed", () => {
  const items = ["a", "b", "c"].map((id) =>
    row(id, {
      monthly_rent_usd: 600,
      lat: 33.97,
      listing_type: "private_room",
      electricity: "scheduled_cuts",
      wifi_included: false,
    }),
  );
  const p = { ...all };
  delete p.gender;
  const w = m.explainWidening(items, p);
  assert.equal(w.labels.length, 7);
  assert.equal(w.alternativeCount, 3);
  assert.equal(w.strictCount, 0);
  const unknown = ["a", "b", "c"].map((id) =>
    row(id, { monthly_rent_usd: null }),
  );
  assert.equal(
    m.explainWidening(unknown, { version: 1, budget: all.budget })
      .alternativeCount,
    0,
  );
  const area = {
    version: 1,
    location: pref({ kind: "area", label: "Verdun", areas: ["Verdun"] }),
  };
  assert.deepEqual(m.explainWidening(items, area).labels, []);
});
test("requirements compile into existing API filters; soft preferences never narrow the query", () => {
  const base = {
    ...m.EMPTY_BROWSE_FILTERS,
    water: ["tank_delivery"],
    studentsOnly: true,
    q: "balcony",
  };
  const f = m.compilePreferences(base, all);
  const api = m.toListFilters("standard", f, "newest");
  assert.deepEqual(api.genderRestrictions, ["girls_only"]);
  assert.equal(api.q, "balcony");
  assert.equal(api.studentsOnly, true);
  assert.deepEqual(api.water, ["tank_delivery"]);
  for (const key of [
    "maxRentUsd",
    "electricity",
    "wifiIncluded",
    "campusId",
    "areas",
    "listingTypes",
  ])
    assert.equal(api[key], undefined, key);
  const hard = m.compilePreferences(base, {
    ...all,
    location: { ...all.location, importance: "required" },
  });
  assert.equal(m.toListFilters("university", hard, "newest").radiusKm, 2);
});
test("URL round-trip retains matcher sort, requirements, and legacy links", () => {
  const state = {
    filters: m.compilePreferences(m.EMPTY_BROWSE_FILTERS, all),
    mode: "standard",
    sort: "match",
    prefs: all,
  };
  const encoded = m.serializeBrowseState(state);
  assert.equal(encoded.genderRestrictions, "girls_only");
  assert.ok(!("matchScore" in encoded));
  const decoded = m.parseBrowseState(encoded);
  assert.deepEqual(JSON.parse(JSON.stringify(decoded.prefs)), all);
  assert.equal(decoded.sort, "match");
  assert.equal(m.parseBrowseState({ campusId: "campus" }).sort, "distance");
  assert.equal(
    m.parseBrowseState({ sort: "match", match: "bad json" }).sort,
    "newest",
  );
  assert.equal(
    m.parseBrowseState({ sort: "match", match: '{"version":2}' }).prefs,
    null,
  );
});
test("existing campus stays flexible and manual edits reconcile only changed dimensions", () => {
  const uni = {
    id: "lau",
    slug: "lau-beirut",
    name: "LAU",
    lat: 33.9,
    lng: 35.48,
  };
  const f = { ...m.EMPTY_BROWSE_FILTERS, campusId: "lau" };
  assert.equal(m.prefillPreferences(f, [uni]).location.importance, "prefer");
  const before = m.compilePreferences(m.EMPTY_BROWSE_FILTERS, all);
  const after = { ...before, maxRentUsd: 400 };
  const p = m.reconcilePreferences(all, before, after, [uni]);
  assert.equal(p.budget.importance, "required");
  assert.equal(p.budget.value.max, 400);
  assert.deepEqual(p.power, all.power);
  assert.equal(
    m.reconcilePreferences(p, after, before, [uni]).budget,
    undefined,
  );
});
test("expired and non-live inventory never receives match treatment", () => {
  const prefs = { version: 1, power: pref(["solar"]) };
  const items = [
    row("live"),
    row("expired", { expiresAt: "2026-09-21" }),
    row("draft", { status: "draft" }),
    row("archived", { status: "archived" }),
  ];
  assert.deepEqual(
    m
      .rankListings(items, prefs, Date.parse("2026-09-22"))
      .listings.map((l) => l.id),
    ["live"],
  );
});
