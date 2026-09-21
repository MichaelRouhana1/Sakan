// Run from repo root: node --test frontend/tests/listing-lifecycle-copy.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outcomeFile = path.join(frontend, "components/web/host/HostExpiryDecisionPage.tsx");
const adminFile = path.join(frontend, "components/admin-neu/expired/ExpiredPage.tsx");

test("expiry surfaces contain only supported actions and manual staff outreach", async () => {
  const outcome = (await readFile(outcomeFile, "utf8")).toLowerCase();
  const admin = (await readFile(adminFile, "utf8")).toLowerCase();
  const disallowed = ["ref" + "und", "money" + "-back", "guar" + "antee"];
  for (const phrase of disallowed) {
    assert.equal(outcome.includes(phrase), false, phrase);
    assert.equal(admin.includes(phrase), false, phrase);
  }
  assert.equal(outcome.includes("boost"), false);
  assert.match(outcome, /still available — renew/i);
  assert.match(outcome, /improve then renew/i);
  assert.match(admin, /open whatsapp/i);
  assert.match(admin, /never sends a whatsapp message/i);
});
