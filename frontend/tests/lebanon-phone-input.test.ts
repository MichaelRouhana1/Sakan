import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveContactPhones,
  emptyContactNumber,
  examplePlaceholder,
  makePrimary,
  maxNationalDigits,
  normalizeContactNumber,
  numbersFromLegacy,
  phoneError,
  rankCountryChoices,
  serializeContactNumber,
  toE164,
  type CountryChoice,
} from "../lib/lebanonPhone.ts";

const sample: CountryChoice[] = [
  { code: "BN", name: "Brunei", calling: "673" },
  { code: "HU", name: "Hungary", calling: "36" },
  { code: "AE", name: "United Arab Emirates", calling: "971" },
  { code: "GB", name: "United Kingdom", calling: "44" },
  { code: "US", name: "United States", calling: "1" },
  { code: "LB", name: "Lebanon", calling: "961" },
  { code: "SA", name: "Saudi Arabia", calling: "966" },
  { code: "RE", name: "Réunion", calling: "262" },
];

test("a saved Lebanese prefix number still reads as +961", () => {
  const number = normalizeContactNumber({
    kind: "mobile",
    prefix: "71",
    subscriber: "123456",
    calls: true,
    whatsapp: true,
    e164: "+96171123456",
  });
  assert.equal(number.country, "LB");
  assert.equal(toE164(number), "+96171123456");
});

test("country search matches the start of the name, then the start of a word", () => {
  assert.deepEqual(rankCountryChoices(sample, "un").map((country) => country.code), ["AE", "GB", "US"]);
  assert.deepEqual(rankCountryChoices(sample, "kingdom").map((country) => country.code), ["GB"]);
  assert.equal(rankCountryChoices(sample, "")[0]?.code, "LB");
});

test("dial code search matches from the start of the code", () => {
  assert.deepEqual(rankCountryChoices(sample, "+96").map((country) => country.code), ["LB", "SA"]);
});

test("make primary keeps the row in place and uses it as the contact number", () => {
  const first = { ...emptyContactNumber(), id: "a", country: "FR", national: "612345678", calls: true, whatsapp: false };
  const second = { ...emptyContactNumber(), id: "b", country: "LB", national: "71123456", calls: true, whatsapp: false };
  const next = makePrimary([first, second], "b");
  assert.equal(next[0]?.id, "a");
  assert.equal(next[1]?.id, "b");
  assert.equal(next[1]?.primary, true);
  assert.equal(next[0]?.primary, false);
  assert.equal(deriveContactPhones(next).contactPhone, "+96171123456");
  const loaded = numbersFromLegacy({ contactNumbers: next });
  assert.equal(loaded[1]?.id, "b");
  assert.equal(loaded[1]?.primary, true);
  assert.equal(loaded.filter((number) => number.primary).length, 1);
});

test("duplicate row ids are split so the second number can become primary", () => {
  const loaded = numbersFromLegacy({
    contactNumbers: [
      { id: "phone-2", country: "LB", national: "76784565", calls: true, whatsapp: false },
      { id: "phone-2", country: "LB", national: "03123331", calls: true, whatsapp: false },
    ],
  });
  assert.notEqual(loaded[0]?.id, loaded[1]?.id);
  const next = makePrimary(loaded, loaded[1]!.id);
  assert.equal(next[1]?.national, "03123331");
  assert.equal(next[1]?.primary, true);
  assert.equal(next[0]?.primary, false);
  assert.equal(next.filter((number) => number.primary).length, 1);
});

test("placeholders and maximum length come from the country", () => {
  assert.equal(examplePlaceholder("LB"), "71 123 456");
  assert.equal(examplePlaceholder("GB"), "7400 123456");
  assert.equal(maxNationalDigits("LB"), 8);
  assert.equal(phoneError(emptyContactNumber()), "Enter a valid number for Lebanon");
  const number = { ...emptyContactNumber(), country: "US", national: "2025550123", calls: true };
  assert.equal(serializeContactNumber(number)?.e164, "+12025550123");
});
