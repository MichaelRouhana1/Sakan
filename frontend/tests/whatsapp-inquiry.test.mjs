import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWhatsAppListingMessage, buildWhatsAppListingUrl } from "../lib/whatsapp.ts";
import { handoffWhatsApp } from "../lib/whatsappHandoff.ts";
import { openWhatsAppUrl } from "../lib/openWhatsAppUrl.web.ts";

const base = { propertyType: "studio", area: "Hamra", monthlyRentUsd: 650 };
const intro = "hi — interested in your studio in Hamra on skoun ($650/mo).";
const empty = `${intro}\nmove-in date:\nwho's moving in (count / students or work):\nok with listed rent + what's included?:`;

test("empty answers preserve the existing template; partial answers trim only their edges", () => {
  assert.equal(buildWhatsAppListingMessage(base), empty);
  assert.equal(buildWhatsAppListingMessage({ ...base, answers: {} }), empty);
  assert.equal(buildWhatsAppListingMessage({ ...base, answers: { moveInDate: " \t ", household: "\n", rentAcceptance: " " } }), empty);
  assert.equal(buildWhatsAppListingMessage({ ...base, answers: { moveInDate: "  mid-November  " } }), empty.replace("move-in date:", "move-in date: mid-November"));
});

test("all answered text, Unicode, line breaks and URL characters survive encoding exactly", () => {
  const answers = { moveInDate: "mid-November", household: "2 students — ليلى & Zoë\npart-time work", rentAcceptance: "Yes + what's included? Wi-Fi / power #1 = 100%" };
  const expected = `${intro}\nmove-in date: ${answers.moveInDate}\nwho's moving in (count / students or work): ${answers.household}\nok with listed rent + what's included?: ${answers.rentAcceptance}`;
  const preview = buildWhatsAppListingMessage({ ...base, answers });
  assert.equal(preview, expected);
  const url = new URL(buildWhatsAppListingUrl({ ...base, answers, phone: "+961 (71) 123-456" }));
  assert.equal(url.pathname, "/96171123456");
  assert.equal(url.searchParams.get("text"), preview);
  assert.equal(url.searchParams.size, 1);
});

test("pending introduction and existing fallback/price formatting are retained", () => {
  assert.match(buildWhatsAppListingMessage({ ...base, availability: "pending", answers: { household: "2 workers" } }), /under offer[\s\S]*who's moving in \(count \/ students or work\): 2 workers/);
  assert.match(buildWhatsAppListingMessage({ ...base, monthlyRentUsd: 1234.6 }), /\(\$1,235\/mo\)/);
  for (const rent of [null, undefined, NaN, Infinity]) {
    assert.doesNotMatch(buildWhatsAppListingMessage({ ...base, monthlyRentUsd: rent }), /\$|\/mo/);
  }
  assert.match(buildWhatsAppListingMessage({ propertyType: " ", area: " " }), /your place in this area/);
});

test("handoff runs immediately and records only after the platform accepts it", async () => {
  const events = [];
  let accept;
  const pending = handoffWhatsApp("https://wa.me/96171123456", "listing", (url) => {
    events.push(url);
    return new Promise((resolve) => { accept = resolve; });
  }, async (id) => { events.push(id); });
  assert.deepEqual(events, ["https://wa.me/96171123456"]);
  accept();
  await pending;
  assert.deepEqual(events, ["https://wa.me/96171123456", "listing"]);
});

test("failed native/browser handoffs do not record leads; analytics failures do not fail contact", async () => {
  let recorded = 0;
  await assert.rejects(handoffWhatsApp("url", "id", async () => { throw new Error("Cannot open"); }, async () => { recorded++; }));
  assert.equal(recorded, 0);
  for (const record of [async () => { throw new Error("offline"); }, () => { throw new Error("sync"); }, () => new Promise(() => {})]) {
    await handoffWhatsApp("url", "id", async () => {}, record);
  }
});

test("web adapter detects blocked windows and removes opener before navigating", async () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { open: () => null };
    await assert.rejects(openWhatsAppUrl("https://wa.me/96171123456"));
    const calls = [];
    const tab = { opener: "parent", location: { replace: (url) => { assert.equal(tab.opener, null); calls.push(url); } }, close: () => calls.push("close") };
    globalThis.window = { open: (...args) => { calls.push(args); return tab; } };
    const result = openWhatsAppUrl("https://wa.me/96171123456");
    assert.deepEqual(calls, [["about:blank", "_blank"], "https://wa.me/96171123456"]);
    await result;
    tab.location.replace = () => { throw new Error("navigation failed"); };
    await assert.rejects(openWhatsAppUrl("https://wa.me/96171123456"));
    assert.equal(calls.at(-1), "close");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
