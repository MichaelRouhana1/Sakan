// Run from backend: node --import tsx --test tests/listing-update-audit.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyListingEdit,
  diffListingUpdate,
  HARD_LISTING_KEYS,
  isMaterialPinMove,
  isWithinStructuralWindow,
  lockedHardKeys,
  SOFT_LISTING_KEYS,
  STRUCTURAL_PIN_MAX_METERS,
  type ListingUpdateSnapshot,
} from "../src/modules/listings/listing-edit-fields.js";

const hamra: { lat: number; lng: number } = { lat: 33.895, lng: 35.478 };
const METERS_PER_DEG_LAT = 111_320;

function shiftNorth(origin: { lat: number; lng: number }, meters: number) {
  return { lat: origin.lat + meters / METERS_PER_DEG_LAT, lng: origin.lng };
}

const base: ListingUpdateSnapshot = {
  title: "Bright Hamra studio near campus",
  description: "A quiet studio with generator backup and fast wifi for studying.",
  monthlyRentUsd: 650,
  spaceType: "entire_place",
  photos: [{ url: "https://cdn.example/a.jpg", caption: "Living" }],
  lat: hamra.lat,
  lng: hamra.lng,
  locationWkt: `POINT(${hamra.lng} ${hamra.lat})`,
};

test("HARD and SOFT sets match the live listing edit plan / schema", () => {
  assert.deepEqual([...HARD_LISTING_KEYS], [
    "spaceType",
    "propertyType",
    "listingType",
    "targetAudience",
    "genderRestriction",
    "bedrooms",
    "beds",
    "bathrooms",
    "maxOccupancy",
    "floorNumber",
    "areaSqm",
    "area",
    "locationWkt",
    "landmark",
    "addressLine",
    "buildingName",
    "primaryCampusId",
  ]);
  assert.ok(SOFT_LISTING_KEYS.includes("priceBasis"));
  assert.ok(SOFT_LISTING_KEYS.includes("furnishingType"));
  assert.ok(SOFT_LISTING_KEYS.includes("photos"));
  assert.ok(SOFT_LISTING_KEYS.includes("electricityCutWindows"));
  assert.ok(SOFT_LISTING_KEYS.includes("contactNumbers"));
  assert.equal(STRUCTURAL_PIN_MAX_METERS, 25);
});

test("no-op saves produce a null diff", () => {
  assert.equal(diffListingUpdate(base, { ...base }), null);
  assert.equal(
    diffListingUpdate(base, {
      ...base,
      title: "Bright Hamra studio near campus",
    }),
    null,
  );
});

test("soft, hard, and mixed classification", () => {
  const soft = diffListingUpdate(base, { ...base, monthlyRentUsd: 700 });
  assert.ok(soft);
  assert.deepEqual(soft.changedKeys, ["monthlyRentUsd"]);
  assert.equal(soft.editClass, "soft");
  assert.equal(soft.before.monthlyRentUsd, 650);
  assert.equal(soft.after.monthlyRentUsd, 700);

  const hard = diffListingUpdate(base, { ...base, bedrooms: 2 });
  assert.ok(hard);
  assert.equal(hard.editClass, "hard");
  assert.deepEqual(hard.changedKeys, ["bedrooms"]);

  const mixed = diffListingUpdate(base, {
    ...base,
    monthlyRentUsd: 700,
    bedrooms: 2,
  });
  assert.ok(mixed);
  assert.equal(mixed.editClass, "mixed");
  assert.deepEqual(mixed.changedKeys, ["bedrooms", "monthlyRentUsd"]);
  assert.equal(classifyListingEdit(["title", "spaceType"]), "mixed");
});

test("photos compare ordered url and caption lists", () => {
  const changed = diffListingUpdate(base, {
    ...base,
    photos: [
      { url: "https://cdn.example/a.jpg", caption: "Living" },
      { url: "https://cdn.example/b.jpg", caption: "Kitchen" },
    ],
  });
  assert.ok(changed);
  assert.deepEqual(changed.changedKeys, ["photos"]);
  assert.equal(changed.editClass, "soft");
  const same = diffListingUpdate(base, {
    ...base,
    photos: [{ url: "https://cdn.example/a.jpg", caption: "Living" }],
  });
  assert.equal(same, null);
});

test("pin ≤25m is omitted; pin >25m is a hard locationWkt change", () => {
  const jitter = shiftNorth(hamra, 10);
  const jitterDiff = diffListingUpdate(base, {
    ...base,
    lat: jitter.lat,
    lng: jitter.lng,
    locationWkt: `POINT(${jitter.lng} ${jitter.lat})`,
  });
  assert.equal(jitterDiff, null);
  assert.equal(isMaterialPinMove(hamra, jitter), false);

  const moved = shiftNorth(hamra, 50);
  const movedDiff = diffListingUpdate(base, {
    ...base,
    lat: moved.lat,
    lng: moved.lng,
    locationWkt: `POINT(${moved.lng} ${moved.lat})`,
  });
  assert.ok(movedDiff);
  assert.deepEqual(movedDiff.changedKeys, ["locationWkt"]);
  assert.equal(movedDiff.editClass, "hard");
  assert.deepEqual(movedDiff.after.locationWkt, moved);
  assert.equal(isMaterialPinMove(hamra, moved), true);
});

test("structural window is 24h after publishedAt", () => {
  const publishedAt = "2026-09-20T12:00:00.000Z";
  assert.equal(
    isWithinStructuralWindow(publishedAt, new Date("2026-09-21T11:59:00.000Z")),
    true,
  );
  assert.equal(
    isWithinStructuralWindow(publishedAt, new Date("2026-09-21T12:00:01.000Z")),
    false,
  );
  assert.equal(isWithinStructuralWindow(null, new Date()), true);
});

test("payload-shaped diff keeps only changed keys", () => {
  const diff = diffListingUpdate(base, {
    ...base,
    title: "Updated Hamra studio near campus",
    contactPhone: "+96171123456",
  });
  assert.ok(diff);
  assert.deepEqual(Object.keys(diff.before).sort(), [
    "contactPhone",
    "title",
  ]);
  assert.deepEqual(Object.keys(diff.after).sort(), ["contactPhone", "title"]);
  assert.equal("description" in diff.before, false);
});

test("hard fields lock after 24h; soft fields and pin jitter do not", () => {
  const publishedAt = "2026-09-20T12:00:00.000Z";
  const inside = new Date("2026-09-21T11:00:00.000Z");
  const outside = new Date("2026-09-22T12:00:00.000Z");

  const rent = diffListingUpdate(base, { ...base, monthlyRentUsd: 800 });
  assert.deepEqual(lockedHardKeys(rent, publishedAt, outside), []);
  assert.deepEqual(lockedHardKeys(rent, publishedAt, inside), []);

  const beds = diffListingUpdate(base, { ...base, bedrooms: 3 });
  assert.deepEqual(lockedHardKeys(beds, publishedAt, inside), []);
  assert.deepEqual(lockedHardKeys(beds, publishedAt, outside), ["bedrooms"]);

  const jitter = shiftNorth(hamra, 10);
  assert.equal(
    lockedHardKeys(
      diffListingUpdate(base, {
        ...base,
        lat: jitter.lat,
        lng: jitter.lng,
        locationWkt: `POINT(${jitter.lng} ${jitter.lat})`,
      }),
      publishedAt,
      outside,
    ).length,
    0,
  );

  const moved = shiftNorth(hamra, 80);
  assert.deepEqual(
    lockedHardKeys(
      diffListingUpdate(base, {
        ...base,
        lat: moved.lat,
        lng: moved.lng,
        locationWkt: `POINT(${moved.lng} ${moved.lat})`,
      }),
      publishedAt,
      outside,
    ),
    ["locationWkt"],
  );

  assert.deepEqual(lockedHardKeys(beds, null, outside), ["bedrooms"]);
});

test("live update path does not debit post credits", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = await readFile(
    path.resolve(here, "../src/modules/listings/listings.service.ts"),
    "utf8",
  );
  const start = src.indexOf("async update(");
  const end = src.indexOf("async archive(");
  assert.ok(start >= 0 && end > start);
  const updateFn = src.slice(start, end);
  assert.doesNotMatch(
    updateFn,
    /debitPostCredit|consumePublishSlot|assertCanPublish|bumpFreeSlotPublish|postCredits/,
  );
  assert.match(updateFn, /STRUCTURAL_FIELDS_LOCKED|StructuralFieldsLockedError/);
  assert.match(updateFn, /status !== "active"/);
});

test("migration adds poster/system actor kinds and actor_user_id", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(
    path.resolve(here, "../drizzle/0024_listing_update_audit.sql"),
    "utf8",
  );
  assert.match(sql, /ADD VALUE 'poster'/);
  assert.match(sql, /ADD VALUE 'system'/);
  assert.match(sql, /actor_user_id/);
});
