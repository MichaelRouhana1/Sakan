import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWhatsAppListingMessage,
  buildWhatsAppListingUrl,
  listingAllowsWhatsApp,
} from "../lib/whatsapp.ts";

const base = {
  propertyType: "studio",
  area: "Hamra",
  monthlyRentUsd: 650,
};

test("whatsapp prefill asks the filters and does not only ask if it is available", () => {
  const text = buildWhatsAppListingMessage(base);
  assert.match(text, /hi — interested in your studio in Hamra on skoun \(\$650\/mo\)\./);
  assert.match(text, /move-in date:/);
  assert.match(text, /who's moving in \(count \/ students or work\):/);
  assert.match(text, /ok with listed rent \+ what's included\?:/);
  assert.equal(/is it still available/i.test(text), false);

  const url = buildWhatsAppListingUrl({ ...base, phone: "+961 71 123 456" });
  assert.match(url, /^https:\/\/wa\.me\/96171123456\?text=/);
  assert.equal(decodeURIComponent(url.split("text=")[1]).includes("is it still available"), false);
});

test("pending whatsapp prefill says the listing is under offer and rented hides contact", () => {
  const pending = buildWhatsAppListingMessage({ ...base, availability: "pending" });
  assert.match(pending, /under offer/);
  assert.match(pending, /move-in date:/);
  assert.equal(/is it still available/i.test(pending), false);
  assert.equal(listingAllowsWhatsApp("pending"), true);
  assert.equal(listingAllowsWhatsApp("available"), true);
  assert.equal(listingAllowsWhatsApp("rented"), false);
});
