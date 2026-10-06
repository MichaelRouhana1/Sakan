import assert from "node:assert/strict";
import { test } from "node:test";
import { nextParkingIncludedInRent } from "../features/listings/create/parkingIncluded.ts";
import {
  formatWhatsAppInclusionLines,
  rentInclusionLines,
} from "../lib/rentInclusion.ts";
import { buildWhatsAppListingMessage } from "../lib/whatsapp.ts";

const listing = {
  propertyType: "studio",
  area: "Hamra",
  monthlyRentUsd: 650,
};

const included = {
  generatorIncluded: true,
  waterBillIncluded: true,
  wifiIncluded: true,
  cookingGasIncluded: true,
  buildingFeesIncluded: true,
  parkingIncludedInRent: true,
  amenities: ["parking"],
};

const separate = {
  generatorIncluded: false,
  waterBillIncluded: false,
  wifiIncluded: false,
  cookingGasIncluded: false,
  buildingFeesIncluded: false,
  parkingIncludedInRent: false,
  amenities: ["parking"],
};

test("detail lines say included when true and ask or separate when false", () => {
  const on = rentInclusionLines(included).map((line) => line.detail);
  assert.deepEqual(on, [
    "Generator fee included",
    "Water bill included",
    "Wi\u2011Fi included",
    "Cooking gas included",
    "Building fees included",
    "Parking included",
  ]);

  const off = rentInclusionLines(separate).map((line) => line.detail);
  assert.deepEqual(off, [
    "Generator fee billed separately",
    "Water bill billed separately",
    "Ask about Wi\u2011Fi",
    "Cooking gas billed separately",
    "Building fees billed separately",
    "Parking extra",
  ]);

  const unset = rentInclusionLines({});
  assert.equal(unset.some((line) => line.key === "parking"), false);
  assert.equal(unset.every((line) => line.included === false), true);
  assert.equal(unset.find((line) => line.key === "wifi")?.detail, "Ask about Wi\u2011Fi");
});

test("whatsapp prefill includes the same billing lines", () => {
  const on = buildWhatsAppListingMessage({
    ...listing,
    inclusionLines: formatWhatsAppInclusionLines(included),
  });
  assert.match(on, /generator fee: included/);
  assert.match(on, /water bill: included/);
  assert.match(on, /wifi: included/);
  assert.match(on, /cooking gas: included/);
  assert.match(on, /building fees: included/);
  assert.match(on, /parking: included/);
  assert.match(on, /move-in date:/);

  const off = buildWhatsAppListingMessage({
    ...listing,
    inclusionLines: formatWhatsAppInclusionLines(separate),
  });
  assert.match(off, /generator fee: billed separately/);
  assert.match(off, /water bill: billed separately/);
  assert.match(off, /wifi: ask/);
  assert.match(off, /cooking gas: billed separately/);
  assert.match(off, /building fees: billed separately/);
  assert.match(off, /parking: extra/);
  assert.equal(/parking: included/.test(off), false);

  const hidden = buildWhatsAppListingMessage({
    ...listing,
    inclusionLines: formatWhatsAppInclusionLines({
      ...separate,
      amenities: [],
      parkingIncludedInRent: true,
    }),
  });
  assert.equal(/parking:/.test(hidden), false);
});

test("parking amenity defaults included in rent only when it turns on", () => {
  assert.equal(
    nextParkingIncludedInRent({
      previousAmenities: [],
      nextAmenities: ["parking"],
      previousIncluded: false,
    }),
    true,
  );
  assert.equal(
    nextParkingIncludedInRent({
      previousAmenities: ["parking"],
      nextAmenities: ["parking"],
      previousIncluded: false,
    }),
    false,
  );
  assert.equal(
    nextParkingIncludedInRent({
      previousAmenities: ["parking"],
      nextAmenities: [],
      previousIncluded: true,
    }),
    false,
  );
  assert.equal(
    nextParkingIncludedInRent({
      previousAmenities: [],
      nextAmenities: ["parking"],
      previousIncluded: false,
      explicit: false,
    }),
    false,
  );
});
