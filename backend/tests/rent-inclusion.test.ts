// Run from backend: node --import tsx --test tests/rent-inclusion.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { diffListingUpdate } from "../src/modules/listings/listing-edit-fields.js";
import {
  listingWriteFromInput,
  snapshotFromWrite,
} from "../src/modules/listings/listing-update-snapshot.js";
import {
  createListingSchema,
  updateListingSchema,
} from "../src/modules/listings/listings.schemas.js";

const base = {
  spaceType: "entire_place",
  propertyType: "studio",
  monthlyRentUsd: 650,
  electricity: "solar",
  water: "tank_delivery",
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  maxOccupancy: 1,
  furnishingType: "furnished",
  floorNumber: 1,
  title: "Bright Hamra studio for students",
  description: "A quiet studio with a real desk and fast wifi near campus.",
  contactName: "Nour",
  contactNumbers: [
    {
      kind: "mobile",
      prefix: "71",
      subscriber: "123456",
      e164: "+96171123456",
      calls: true,
      whatsapp: true,
    },
  ],
  area: "Hamra",
  locationWkt: "POINT(35.478 33.895)",
  photoUrls: [
    "https://cdn.example/a.jpg",
    "https://cdn.example/b.jpg",
    "https://cdn.example/c.jpg",
  ],
};

const FLAGS = [
  "waterBillIncluded",
  "buildingFeesIncluded",
  "parkingIncludedInRent",
] as const;

test("publish defaults new rent-inclusion flags to false", () => {
  const parsed = createListingSchema.parse(base);
  assert.equal(parsed.waterBillIncluded, false);
  assert.equal(parsed.buildingFeesIncluded, false);
  assert.equal(parsed.parkingIncludedInRent, false);
});

test("publish accepts combinations and drops parking fee without the amenity", () => {
  const mixed = createListingSchema.parse({
    ...base,
    waterBillIncluded: true,
    buildingFeesIncluded: false,
    parkingIncludedInRent: true,
    amenities: ["parking"],
    generatorIncluded: true,
    wifiIncluded: false,
    cookingGasIncluded: true,
  });
  assert.equal(mixed.waterBillIncluded, true);
  assert.equal(mixed.buildingFeesIncluded, false);
  assert.equal(mixed.parkingIncludedInRent, true);
  assert.equal(mixed.generatorIncluded, true);
  assert.equal(mixed.wifiIncluded, false);
  assert.equal(mixed.cookingGasIncluded, true);

  const feesOnly = createListingSchema.parse({
    ...base,
    waterBillIncluded: false,
    buildingFeesIncluded: true,
    parkingIncludedInRent: false,
    amenities: ["parking", "ac"],
  });
  assert.equal(feesOnly.waterBillIncluded, false);
  assert.equal(feesOnly.buildingFeesIncluded, true);
  assert.equal(feesOnly.parkingIncludedInRent, false);

  const coerced = updateListingSchema.parse({
    ...base,
    parkingIncludedInRent: true,
    amenities: ["ac"],
    publishNow: true,
  });
  assert.equal(coerced.parkingIncludedInRent, false);
  assert.equal("publishNow" in coerced, false);
});

test("publish rejects non-boolean rent-inclusion flags", () => {
  for (const field of FLAGS) {
    for (const bad of ["yes", "true", "false", 1, 0, null]) {
      const created = createListingSchema.safeParse({ ...base, [field]: bad });
      assert.equal(created.success, false, `${field} create ${String(bad)}`);
      if (!created.success) {
        assert.ok(
          created.error.issues.some((issue) => issue.path[0] === field),
          `${field} create path`,
        );
      }
      const updated = updateListingSchema.safeParse({ ...base, [field]: bad });
      assert.equal(updated.success, false, `${field} update ${String(bad)}`);
    }
  }
});

test("editing rent-inclusion flags is a soft listing change", () => {
  const before = updateListingSchema.parse(base);
  const after = updateListingSchema.parse({
    ...base,
    waterBillIncluded: true,
    buildingFeesIncluded: true,
    amenities: ["parking"],
    parkingIncludedInRent: true,
  });
  const diff = diffListingUpdate(
    snapshotFromWrite(listingWriteFromInput(before)),
    snapshotFromWrite(listingWriteFromInput(after)),
  );
  assert.ok(diff);
  assert.deepEqual(
    [...diff.changedKeys].sort(),
    ["amenities", "buildingFeesIncluded", "parkingIncludedInRent", "waterBillIncluded"],
  );
  assert.equal(diff.editClass, "soft");
});
