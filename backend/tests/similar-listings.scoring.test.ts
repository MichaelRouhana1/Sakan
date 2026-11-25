import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSimilarCandidateEligible,
  rankSimilarListings,
  scoreSimilarListing,
  type SimilarScoringListing,
} from "../src/modules/listings/similar-listings.scoring.js";

const NOW = Date.parse("2026-11-22T12:00:00Z");

function makeListing(overrides: Partial<SimilarScoringListing> = {}): SimilarScoringListing {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    placeId: "10000000-0000-4000-8000-000000000001",
    status: "active",
    availability: "available",
    hidden: false,
    hiddenReason: null,
    expiresAt: "2027-01-01T00:00:00Z",
    inventoryNeedsConfirmation: false,
    bedsAvailable: null,
    genderRestriction: "anyone",
    area: "Hamra",
    city: "Beirut",
    primaryCampusId: "campus-aub",
    lat: 33.8975,
    lng: 35.4835,
    distanceFromSourceMeters: null,
    monthlyRentUsd: 450,
    listingType: "private_room",
    unitType: "private_room",
    photoCount: 4,
    publishedAt: "2026-11-20T12:00:00Z",
    createdAt: "2026-11-20T12:00:00Z",
    ...overrides,
  };
}

describe("similar-listings scoring", () => {
  const source = makeListing();

  it("enforces hard exclusions (self, same place, inactive/rented/hidden/expired/beds, gender conflict)", () => {
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: source.id, placeId: "p2" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c2", placeId: source.placeId }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c3", placeId: "p3", status: "archived" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c4", placeId: "p4", availability: "rented" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c5", placeId: "p5", hidden: true }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c6", placeId: "p6", hiddenReason: "place_hidden" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c7", placeId: "p7", expiresAt: "2026-11-20T00:00:00Z" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c8", placeId: "p8", inventoryNeedsConfirmation: true }), NOW), false);
    assert.equal(isSimilarCandidateEligible(source, makeListing({ id: "c9", placeId: "p9", bedsAvailable: 0 }), NOW), true);

    const girlsSource = makeListing({ genderRestriction: "girls_only" });
    assert.equal(isSimilarCandidateEligible(girlsSource, makeListing({ id: "c10", placeId: "p10", genderRestriction: "boys_only" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(girlsSource, makeListing({ id: "c11", placeId: "p11", genderRestriction: "girls_only" }), NOW), true);
    assert.equal(isSimilarCandidateEligible(girlsSource, makeListing({ id: "c12", placeId: "p12", genderRestriction: "anyone" }), NOW), true);

    const boysSource = makeListing({ genderRestriction: "boys_only" });
    assert.equal(isSimilarCandidateEligible(boysSource, makeListing({ id: "c13", placeId: "p13", genderRestriction: "girls_only" }), NOW), false);
    assert.equal(isSimilarCandidateEligible(boysSource, makeListing({ id: "c14", placeId: "p14", genderRestriction: "boys_only" }), NOW), true);
  });

  it("scores the 4 signals accurately and ranks closer/comparable listings higher", () => {
    const ideal = makeListing({
      id: "c-ideal",
      placeId: "p-ideal",
      area: "Hamra",
      primaryCampusId: "campus-aub",
      distanceFromSourceMeters: 250,
      monthlyRentUsd: 440,
      listingType: "private_room",
      photoCount: 5,
      publishedAt: "2026-11-22T10:00:00Z",
    });

    const adjacentPriceHigher = makeListing({
      id: "c-mid",
      placeId: "p-mid",
      area: "Verdun",
      primaryCampusId: null,
      distanceFromSourceMeters: 1500,
      monthlyRentUsd: 620,
      listingType: "studio",
      photoCount: 2,
      publishedAt: "2026-10-15T10:00:00Z",
    });

    const distantMismatched = makeListing({
      id: "c-far",
      placeId: "p-far",
      area: "Byblos",
      city: "Byblos",
      primaryCampusId: "campus-lau-byblos",
      distanceFromSourceMeters: 38_000,
      monthlyRentUsd: 1100,
      listingType: "entire_apartment",
      unitType: "whole_apartment",
      photoCount: 0,
      publishedAt: "2026-06-01T10:00:00Z",
    });

    const ranked = rankSimilarListings(source, [distantMismatched, adjacentPriceHigher, ideal], { now: NOW });
    assert.deepEqual(
      ranked.map((r) => r.listing.id),
      ["c-ideal", "c-mid", "c-far"],
    );
    assert.equal(ranked[0]!.reason, "Same area");
    assert.ok(ranked[0]!.score > 95);
    assert.equal(ranked[0]!.breakdown.location, 40);
    assert.equal(ranked[0]!.breakdown.rent, 30);
    assert.equal(ranked[0]!.breakdown.unitType, 20);
    assert.ok(ranked[0]!.breakdown.freshnessAndPhotos > 9.5);
  });

  it("keeps at most one best-scoring unit per placeId", () => {
    const cheapSamePlace = makeListing({
      id: "u1",
      placeId: "shared-place",
      monthlyRentUsd: 900,
      listingType: "entire_apartment",
    });
    const betterSamePlace = makeListing({
      id: "u2",
      placeId: "shared-place",
      monthlyRentUsd: 450,
      listingType: "private_room",
    });
    const otherPlace = makeListing({
      id: "u3",
      placeId: "other-place",
      monthlyRentUsd: 460,
      listingType: "private_room",
    });

    const ranked = rankSimilarListings(source, [cheapSamePlace, betterSamePlace, otherPlace], { now: NOW });
    assert.equal(ranked.length, 2);
    assert.equal(ranked.filter((r) => r.listing.placeId === "shared-place").length, 1);
    assert.equal(ranked.find((r) => r.listing.placeId === "shared-place")!.listing.id, "u2");
  });

  it("derives crisp similarity reasons for non-same-area matches", () => {
    const sameCampus = scoreSimilarListing(
      source,
      makeListing({ id: "r1", placeId: "p1", area: "Ras Beirut", primaryCampusId: "campus-aub", distanceFromSourceMeters: 900 }),
      NOW,
    );
    assert.equal(sameCampus.reason, "Same campus");

    const nearby = scoreSimilarListing(
      source,
      makeListing({ id: "r2", placeId: "p2", area: "Verdun", primaryCampusId: null, distanceFromSourceMeters: 1200 }),
      NOW,
    );
    assert.equal(nearby.reason, "Nearby");

    const similarPrice = scoreSimilarListing(
      source,
      makeListing({ id: "r3", placeId: "p3", area: "Achrafieh", primaryCampusId: null, distanceFromSourceMeters: 4200, monthlyRentUsd: 470 }),
      NOW,
    );
    assert.equal(similarPrice.reason, "Similar price");
  });
});
