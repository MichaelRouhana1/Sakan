import assert from "node:assert/strict";
import test from "node:test";
import { canonicalE164 } from "../src/lib/lebanonPhone.ts";

test("legacy Lebanese contact numbers still resolve", () => {
  assert.equal(
    canonicalE164({ kind: "mobile", prefix: "71", subscriber: "123456", e164: "+96171123456", calls: true, whatsapp: true }),
    "+96171123456",
  );
});

test("an international number resolves from its national digits", () => {
  assert.equal(
    canonicalE164({ country: "US", national: "2025550123", e164: "+12025550123", calls: true, whatsapp: true }),
    "+12025550123",
  );
  assert.equal(
    canonicalE164({ country: "US", national: "2025550123", e164: "+96171123456", calls: true, whatsapp: true }),
    "+12025550123",
  );
});
