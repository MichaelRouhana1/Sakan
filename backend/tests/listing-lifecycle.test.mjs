// Run from backend: npm run test:lifecycle
import assert from "node:assert/strict";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createPurchaseSchema,
  creditReturnToSchema,
} from "../dist/modules/credits/credits.schemas.js";
import {
  listingExpiryDecisionSchema,
  listingRenewSchema,
} from "../dist/modules/listings/listing-expiry.schemas.js";

const cycle = "2026-09-21T12:00:00.000Z";
const listingId = "00000000-0000-4000-8000-000000000001";
const returnTo = `/hosting/listing/${listingId}/outcome`;

test("expiry decisions require an exact cycle and supported host choice", () => {
  for (const decision of ["rented", "still_available", "improve", "archive"]) {
    assert.equal(
      listingExpiryDecisionSchema.safeParse({ cycleExpiresAt: cycle, decision }).success,
      true,
      decision,
    );
  }
  for (const decision of ["boost", "delete", "", undefined]) {
    assert.equal(
      listingExpiryDecisionSchema.safeParse({ cycleExpiresAt: cycle, decision }).success,
      false,
      String(decision),
    );
  }
  assert.equal(listingRenewSchema.safeParse({ cycleExpiresAt: cycle }).success, true);
  assert.equal(listingRenewSchema.safeParse({ cycleExpiresAt: "yesterday" }).success, false);
});

test("credit checkout only accepts an owned-listing outcome return path shape", () => {
  assert.equal(creditReturnToSchema.safeParse(returnTo).success, true);
  for (const value of [
    "https://example.com/hosting/listing/00000000-0000-4000-8000-000000000001/outcome",
    "/admin/expired",
    "/hosting/credits",
    "/hosting/listing/not-a-uuid/outcome",
    `${returnTo}?next=https://example.com`,
  ]) assert.equal(creditReturnToSchema.safeParse(value).success, false, value);
  assert.equal(
    createPurchaseSchema.safeParse({ bundleType: "starter", returnTo }).success,
    true,
  );
});

test("migration contains append-only cycle history and delivery deduplication", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(
    path.resolve(here, "../drizzle/0023_listing_lifecycle.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "listing_lifecycle_events"/);
  assert.match(sql, /listing_lifecycle_cycle_event_uq/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "notification_deliveries"/);
  assert.match(sql, /notification_delivery_dedupe_uq/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "user_push_tokens"/);
});

test("owner decision routes are authenticated and precede public listing lookup", async () => {
  const { listingsRouter } = await import("../dist/modules/listings/listings.routes.js");
  const { requireAuth } = await import("../dist/middleware/auth.js");
  const stack = listingsRouter.stack;
  const genericIndex = stack.findIndex((layer) => layer.route?.path === "/:id");
  for (const routePath of ["/:id/expiry-decision", "/:id/renew"]) {
    const matches = stack.filter((layer) => layer.route?.path === routePath);
    assert.ok(matches.length > 0, routePath);
    assert.ok(stack.indexOf(matches[0]) < genericIndex, `${routePath} route precedence`);
    for (const layer of matches) {
      assert.equal(layer.route.stack[0].handle, requireAuth, `${routePath} auth`);
    }
  }
});
