import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SILENCE_COPY,
  silenceDiagnosis,
  silenceEditSection,
  type SilenceInput,
} from "../features/listings/silenceDiagnosis.ts";

const base: SilenceInput = {
  live: true,
  viewCount: 12,
  leadCount: 0,
  photoCount: 5,
  hasPin: true,
  rentUsd: 500,
  compHighUsd: null,
  compsReady: true,
  boosted: false,
  boostSpendAvailable: true,
};

test("a listing with whatsapp taps has no silence diagnosis", () => {
  assert.equal(silenceDiagnosis({ ...base, leadCount: 1 }), null);
  assert.equal(silenceDiagnosis({ ...base, live: false }), null);
});

test("views and zero taps pick the first matching next step", () => {
  assert.equal(silenceDiagnosis({ ...base, photoCount: 2 }), "add_photos");
  assert.equal(
    silenceDiagnosis({ ...base, compHighUsd: 450, rentUsd: 500 }),
    "review_price",
  );
  assert.equal(
    silenceDiagnosis({ ...base, compHighUsd: 500, rentUsd: 500 }),
    "boost",
  );
  assert.equal(silenceDiagnosis({ ...base, compHighUsd: null }), "boost");
  assert.equal(
    silenceDiagnosis({ ...base, boosted: true }),
    "wait_peak",
  );
  assert.equal(
    silenceDiagnosis({ ...base, boostSpendAvailable: false }),
    "wait_peak",
  );
  assert.equal(silenceDiagnosis({ ...base, compsReady: false }), null);
});

test("zero views never suggests a boost", () => {
  assert.equal(
    silenceDiagnosis({
      ...base,
      viewCount: 0,
      photoCount: 1,
      boostSpendAvailable: true,
      boosted: false,
    }),
    "check_place",
  );
  assert.equal(
    silenceDiagnosis({ ...base, viewCount: 0, photoCount: 5, hasPin: false }),
    "check_place",
  );
  assert.equal(
    silenceDiagnosis({ ...base, viewCount: 0, photoCount: 5, hasPin: true }),
    "share",
  );
});

test("each diagnosis has one plain next step and a real destination", () => {
  const joined = Object.values(SILENCE_COPY)
    .map((copy) => `${copy.title} ${copy.body} ${copy.cta}`)
    .join("\n")
    .toLowerCase();
  assert.equal(/guaranteed|inquir|act now|hurry|last chance/.test(joined), false);
  assert.equal(silenceEditSection("add_photos", { photoCount: 1 }), "photos");
  assert.equal(silenceEditSection("review_price", { photoCount: 5 }), "pricing");
  assert.equal(silenceEditSection("check_place", { photoCount: 1 }), "photos");
  assert.equal(silenceEditSection("check_place", { photoCount: 4 }), "location");
  assert.equal(silenceEditSection("boost", { photoCount: 5 }), null);
  assert.equal(silenceEditSection("share", { photoCount: 5 }), null);
  assert.equal(Object.keys(SILENCE_COPY).length, 6);
});
