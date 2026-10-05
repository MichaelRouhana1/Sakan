import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(rel) {
  return readFile(path.join(frontend, rel), "utf8");
}

test("listing analytics shows a leads card and does not promise replies", async () => {
  const page = await source("components/web/host/HostListingAnalyticsPage.tsx");
  assert.match(page, /label="Views"/);
  assert.match(page, /icon="eye-outline"/);
  assert.match(page, /label="Leads"/);
  assert.match(page, /icon="chatbubble-ellipses-outline"/);
  assert.match(page, /label=\{endingSoon \? "Expires soon" : "Days left"\}/);
  assert.match(page, /icon=\{endingSoon \? "alarm-outline" : "time-outline"\}/);
  assert.match(page, /name="calendar-outline"/);
  assert.match(page, /name="checkmark-circle-outline"/);
  assert.match(
    page,
    /Leads = taps on contact WhatsApp\. Not the same as a reply\./,
  );
  assert.equal(/inquir/i.test(page), false);
  assert.equal(/guaranteed/i.test(page), false);
  assert.match(page, /leadTotal\(listing\.leadCount\)/);
});

test("detail entry points delegate to one inquiry; call and share do not record leads", async () => {
  const web = await source("components/web/ListingDetailWeb.tsx");
  const mobile = await source("components/listings/detail/ListingDetailMobile.tsx");
  const bar = await source("components/listings/detail/ListingDetailBottomBar.tsx");
  const rooms = await source("components/listings/detail/ListingDetailRooms.tsx");
  const controller = await source("features/listings/useWhatsAppInquiry.ts");
  const recorder = await source("features/listings/recordListingContactTap.ts");
  for (const screen of [web, mobile]) {
    assert.match(screen, /useWhatsAppInquiry\(listing\)/);
    assert.match(screen, /<WhatsAppInquirySheet inquiry=\{inquiry\} \/>/);
    assert.match(screen, /onWhatsApp=\{inquiry.open\}/);
  }
  for (const entry of [web, mobile, bar, rooms]) {
    assert.equal(entry.includes("recordListingContactTap"), false);
    assert.equal(entry.includes("buildWhatsAppListingUrl"), false);
  }
  for (const child of [bar, rooms]) assert.match(child, /onPress=\{onWhatsApp\}/);
  assert.match(controller, /handoffWhatsApp\(url, listing.id, openWhatsAppUrl, recordListingContactTap\)/);
  assert.match(recorder, /\/api\/listings\/\$\{listingId\}\/contact-tap/);
  assert.equal(web.includes("onCall={() => void Linking.openURL"), true);
  assert.equal(bar.includes("Linking.openURL(`tel:${callPhone}`)"), true);
});
