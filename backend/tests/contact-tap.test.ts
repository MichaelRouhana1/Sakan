import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTACT_TAP_DEDUPE_MS,
  ContactTapWindow,
  contactTapActorKey,
  planContactTap,
} from "../src/modules/listings/contact-tap.js";

test("contact taps count for a live listing and keep the stored total otherwise", () => {
  assert.deepEqual(
    planContactTap({
      found: true,
      status: "active",
      leadCount: 4,
      withinDedupeWindow: false,
    }),
    { type: "increment" },
  );
  assert.deepEqual(
    planContactTap({
      found: true,
      status: "archived",
      leadCount: 4,
      withinDedupeWindow: false,
    }),
    { type: "unchanged", leadCount: 4 },
  );
  assert.deepEqual(
    planContactTap({
      found: true,
      status: "active",
      leadCount: 4,
      withinDedupeWindow: true,
    }),
    { type: "unchanged", leadCount: 4 },
  );
  assert.deepEqual(
    planContactTap({
      found: false,
      status: "",
      leadCount: 0,
      withinDedupeWindow: false,
    }),
    { type: "not_found" },
  );
});

test("the same user or IP is counted once inside the short window", () => {
  let now = 1_000;
  const window = new ContactTapWindow(CONTACT_TAP_DEDUPE_MS, () => now);
  const key = contactTapActorKey("listing-1", { userId: "user-1", ip: "1.1.1.1" });
  assert.equal(window.claim(key), true);
  assert.equal(window.claim(key), false);
  now += CONTACT_TAP_DEDUPE_MS;
  assert.equal(window.claim(key), true);

  const otherListing = contactTapActorKey("listing-2", { userId: "user-1" });
  const guest = contactTapActorKey("listing-1", { ip: "2.2.2.2" });
  assert.equal(window.claim(otherListing), true);
  assert.equal(window.claim(guest), true);
  assert.equal(contactTapActorKey("listing-1", { userId: "  " }), null);
  assert.equal(window.claim(null), true);
});
