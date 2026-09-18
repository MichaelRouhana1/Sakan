import { test, expect, type Page, type Locator } from "@playwright/test";
import { INITIAL_DRAFT, CREATE_DRAFT_CHECKPOINT_KEY } from "../features/listings/create/draft";

const initialKeys = ["hl-walk_to_campus", "hl-power_24_7", "hl-fiber", "hl-quiet_area"];
const zone = (page: Page) => page.getByTestId("card-badge-drop-zone");
const pool = (page: Page) => page.getByTestId("available-badge-pool");
const cardKeys = (page: Page) => zone(page).locator("[data-badge-key]").evaluateAll((els) => els.map((el) => el.getAttribute("data-badge-key")));

async function setup(page: Page, keys: string[] | null = initialKeys, step = 9) {
  const draft = {
    ...INITIAL_DRAFT, step, spaceType: "entire_place", propertyType: "studio", area: "Mar Mikhael",
    pin: { ...INITIAL_DRAFT.pin, confirmed: true }, primaryCampusId: "test-campus",
    furnishingType: "furnished", electricity: "solar", water: "state_well_24_7", routerUps: true,
    targetAudience: "mixed", monthlyRentUsd: "720", title: "Mar Mikhael loft-style studio",
    description: "A bright furnished studio close to campus and local shops.", listingPosterRole: "landlord",
    contactName: "Test host", contactNumbers: [{ kind: "mobile", prefix: "71", subscriber: "123456", calls: true, whatsapp: true }],
    amenities: ["study_desk", "water_heater_electric", "parking", "washer", "balcony", "ac_all_rooms"],
    highlightTags: ["walk_to_campus", "power_24_7", "fiber", "quiet_area", "newly_renovated"], cardBadges: keys,
    photos: [0, 1, 2].map((i) => ({ localId: `photo-${i}`, status: "ready", uri: `https://badge-test.invalid/photo-${i}.jpg`, url: `https://badge-test.invalid/photo-${i}.jpg` })),
  };
  await page.route("**/api/**", (route) => route.fulfill({ json: {
    data: route.request().url().endsWith("/users/me") ? { postCredits: 2, boostCredits: 0 } : [],
  } }));
  await page.route("https://badge-test.invalid/**", (route) => process.env.SKOUN_TEST_PHOTO
    ? route.fulfill({ path: process.env.SKOUN_TEST_PHOTO, contentType: "image/jpeg" })
    : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#dfdad2"/><rect x="460" y="30" width="220" height="320" fill="#b5c9cb"/><path d="M570 30V350M460 190H680" stroke="#fff" stroke-width="12"/><rect x="50" y="270" width="330" height="140" rx="25" fill="#8e9681"/><rect x="80" y="400" width="20" height="40" fill="#514e45"/><rect x="330" y="400" width="20" height="40" fill="#514e45"/></svg>' }));
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem("badge-test-seeded")) {
      localStorage.setItem(key, JSON.stringify(value));
      sessionStorage.setItem("badge-test-seeded", "1");
    }
  }, { key: CREATE_DRAFT_CHECKPOINT_KEY, value: { draft, committedStep: 8, savedStep: step, savedAt: new Date().toISOString() } });
  await page.goto("/create");
  await expect(page.getByRole("button", { name: "Save and exit" })).toBeVisible();
}

async function point(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Drag target is missing");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(page: Page, from: Locator, to: Locator, leftEdge = false) {
  const start = await point(from);
  const target = await point(to);
  if (leftEdge) target.x = (await to.boundingBox())!.x + 2;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y, { steps: 2 });
  await page.mouse.move(target.x, target.y, { steps: 15 });
  await page.mouse.up();
}

test("step 10: drag, limit, mirror, cancel, save/resume and publish payload", async ({ page }) => {
  await setup(page, initialKeys, 8);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("10 / 10", { exact: true })).toBeVisible();
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(4);
  await pool(page).getByRole("button", { name: "Add Solar Power to card", exact: true }).click();
  await pool(page).getByRole("button", { name: "Add UPS Wi-Fi to card", exact: true }).click();
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(6);
  const six = await cardKeys(page);
  await pool(page).getByRole("button", { name: "Add 24/7 Water to card", exact: true }).click();
  await expect(page.getByText("Remove a badge before adding another.", { exact: true })).toBeVisible();
  await drag(page, pool(page).locator('[data-badge-key="water_24"]'), zone(page));
  expect(await cardKeys(page)).toEqual(six);
  await drag(page, zone(page).locator('[data-badge-key="solar"]'), pool(page).getByText("Available badges", { exact: true }));
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(5);
  await drag(page, pool(page).locator('[data-badge-key="water_24"]'), zone(page).locator("[data-badge-key]").first(), true);
  await expect.poll(() => cardKeys(page)).toEqual(["water_24", ...initialKeys, "ups_wifi"]);
  await drag(page, zone(page).locator('[data-badge-key="ups_wifi"]'), zone(page).locator("[data-badge-key]").first(), true);
  const reordered = ["ups_wifi", "water_24", ...initialKeys];
  await expect.poll(() => cardKeys(page)).toEqual(reordered);
  const labels = await zone(page).getByRole("button", { name: /^Arrange / }).allTextContents();
  const listText = await page.getByTestId("list-card-preview").innerText();
  for (let i = 1; i < labels.length; i++) expect(listText.indexOf(labels[i].trim())).toBeGreaterThan(listText.indexOf(labels[i - 1].trim()));
  // A drop on the wide preview does not edit it or remove the source badge.
  await drag(page, zone(page).locator("[data-badge-key]").first(), page.getByTestId("list-card-preview"));
  expect(await cardKeys(page)).toEqual(reordered);
  const start = await point(zone(page).locator("[data-badge-key]").first());
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 10);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await cardKeys(page)).toEqual(reordered);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(() => cardKeys(page)).toEqual(reordered);
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).draft.cardBadges, CREATE_DRAFT_CHECKPOINT_KEY)).toEqual(reordered);
  await page.goto("/create");
  await expect(page.getByText("10 / 10", { exact: true })).toBeVisible();
  await expect.poll(() => cardKeys(page)).toEqual(reordered);
  let published: { cardBadges: string[] } | undefined;
  await page.route("**/api/listings", async (route) => {
    published = route.request().postDataJSON();
    await route.fulfill({ status: 422, json: { error: { message: "Test submission received" } } });
  });
  await page.getByRole("button", { name: "Publish listing", exact: true }).click();
  await expect(page.getByText("Test submission received", { exact: true })).toBeVisible();
  expect(published?.cardBadges).toEqual(reordered);
});

test("keyboard controls and explicitly empty selection", async ({ page }) => {
  await setup(page);
  const first = zone(page).getByRole("button", { name: /^Arrange Walk to campus/ });
  await first.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect.poll(() => cardKeys(page)).toEqual([initialKeys[1], initialKeys[0], ...initialKeys.slice(2)]);
  await page.keyboard.press("Delete");
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(3);
  while (await zone(page).getByRole("button", { name: /^Remove / }).count()) {
    await zone(page).getByRole("button", { name: /^Remove / }).first().click();
  }
  await expect(zone(page)).toContainText("Drop badges here");
  await page.getByRole("button", { name: "Save and exit" }).click();
  await page.goto("/create");
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(0);
});

test("desktop reference layout and responsive long labels", async ({ page }, info) => {
  await setup(page, ["amenity:study_desk", "amenity:water_heater_electric", "amenity:parking", "amenity:washer", "amenity:balcony", "amenity:ac_all_rooms"]);
  for (const width of [2048, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1166 });
    await expect(zone(page).locator("[data-badge-key]")).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const badgeBounds = await zone(page).boundingBox();
    for (const chip of await zone(page).locator("[data-badge-key]").all()) {
      const bounds = await chip.boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(badgeBounds!.x + badgeBounds!.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(badgeBounds!.y + badgeBounds!.height + 1);
    }
    await expect(page.getByTestId("list-card-preview")).toHaveCount(width >= 1024 ? 1 : 0);
    await page.screenshot({ path: info.outputPath(`review-${width}.png`) });
  }
});

test("legacy selections normalize to six eligible badges", async ({ page }) => {
  await setup(page, ["invalid", ...initialKeys, initialKeys[0], "solar", "ups_wifi", "water_24"]);
  await expect.poll(() => cardKeys(page)).toEqual([...initialKeys, "solar", "ups_wifi"]);
});

test("phone touch dragging adds and removes without changing the wide preview", async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: process.env.SKOUN_TEST_URL ?? "http://localhost:8082", viewport: { width: 390, height: 1200 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await setup(page, []);
  const session = await context.newCDPSession(page);
  const from = pool(page).locator('[data-badge-key="solar"]');
  await from.scrollIntoViewIfNeeded();
  const start = await point(from);
  const target = await point(zone(page));
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
  for (let i = 1; i <= 10; i++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (target.x - start.x) * i / 10, y: start.y + (target.y - start.y) * i / 10 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => cardKeys(page)).toEqual(["solar"]);
  await page.evaluate(() => {
    for (const type of ["pointerdown", "pointermove", "pointerup", "click", "touchstart", "touchend"]) {
      window.addEventListener(type, (e) => console.log("TOUCH_DEBUG", type, (e.target as HTMLElement).closest("[role='button']")?.getAttribute("aria-label"), e.defaultPrevented), true);
      window.addEventListener(type, (e) => console.log("TOUCH_DEBUG bubble", type, e.defaultPrevented));
    }
  });
  page.on("console", (msg) => { if (msg.text().includes("TOUCH_DEBUG")) console.log(msg.text()); });
  await zone(page).getByRole("button", { name: "Arrange Solar Power, badge 1 of 1" }).tap();
  await expect(zone(page).getByRole("button", { name: "Move Solar Power later" })).toBeVisible();
  await zone(page).getByRole("button", { name: "Remove Solar Power", exact: true }).tap();
  await expect(zone(page).locator("[data-badge-key]")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("review-touch.png") });
  await context.close();
});
