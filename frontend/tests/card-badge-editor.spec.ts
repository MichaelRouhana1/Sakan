import { test, expect, type Page, type Locator } from "@playwright/test";
import { INITIAL_DRAFT, CREATE_DRAFT_CHECKPOINT_KEY } from "../features/listings/create/draft";

const initialKeys = ["hl-walk_to_campus", "hl-power_24_7", "hl-fiber", "hl-quiet_area"];
const zone = (page: Page) => page.getByTestId("list-card-preview").getByTestId("card-badge-drop-zone");
const grid = (page: Page) => page.getByTestId("grid-card-preview");
const cardKeys = (page: Page) => zone(page).locator("[data-badge-key]").evaluateAll((els) => els.map((el) => el.getAttribute("data-badge-key")));
const handle = (page: Page, key: string) => zone(page).locator(`[data-badge-key="${key}"]`);

async function setup(page: Page, keys: string[] | null = initialKeys, step = 9) {
  const draft = {
    ...INITIAL_DRAFT, step, spaceType: "entire_place", propertyType: "studio", area: "Mar Mikhael",
    pin: { ...INITIAL_DRAFT.pin, confirmed: true }, primaryCampusId: "test-campus",
    furnishingType: "furnished", electricity: "solar", water: "state_well_24_7", routerUps: true,
    targetAudience: "students_professionals", monthlyRentUsd: "720", title: "Mar Mikhael loft-style studio",
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

test("step 10: every badge is on the card, list reorder, grid scrolls", async ({ page }) => {
  await setup(page, initialKeys, 8);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("10 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Every badge on this listing is on the card. Drag to set the order.")).toBeVisible();
  await expect(page.getByTestId("available-badge-pool")).toHaveCount(0);
  await expect(page.getByText("Remove a badge before adding another.")).toHaveCount(0);
  const loaded = await cardKeys(page);
  expect(loaded.length).toBeGreaterThan(6);
  expect(loaded.slice(0, initialKeys.length)).toEqual(initialKeys);
  expect(loaded).toContain("solar");
  expect(loaded).toContain("water_24");
  await expect(grid(page).locator("[data-badge-handle]")).toHaveCount(0);
  await expect(grid(page).getByRole("button", { name: /^Arrange / })).toHaveCount(0);
  await expect.poll(() => page.getByTestId("grid-badge-scroller").evaluate((el) => {
    const scroller = el as HTMLElement;
    return scroller.scrollHeight > scroller.clientHeight + 8
      && scroller.clientHeight <= 70
      && scroller.clientHeight >= 40;
  })).toBe(true);

  await handle(page, "solar").scrollIntoViewIfNeeded();
  await drag(page, handle(page, "solar"), zone(page).locator("[data-badge-key]").first(), true);
  const reordered = ["solar", ...loaded.filter((key) => key !== "solar")];
  await expect.poll(() => cardKeys(page)).toEqual(reordered);
  const gridText = await grid(page).innerText();
  expect(gridText.indexOf("Solar Power")).toBeGreaterThanOrEqual(0);
  expect(gridText.indexOf("Solar Power")).toBeLessThan(gridText.indexOf("Walk to campus"));

  await drag(page, handle(page, "solar"), grid(page));
  expect(await cardKeys(page)).toEqual(reordered);
  const start = await point(handle(page, "solar"));
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

test("keyboard reorder keeps every badge", async ({ page }) => {
  await setup(page);
  const before = await cardKeys(page);
  expect(before.slice(0, initialKeys.length)).toEqual(initialKeys);
  const first = zone(page).getByRole("button", { name: /^Arrange Walk to campus/ });
  await first.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect.poll(() => cardKeys(page)).toEqual([before[1], before[0], ...before.slice(2)]);
  await page.keyboard.press("Delete");
  expect(await cardKeys(page)).toEqual([before[1], before[0], ...before.slice(2)]);
  await expect(zone(page).getByRole("button", { name: /^Remove / })).toHaveCount(0);
});

test("desktop reference layout and responsive long labels", async ({ page }, info) => {
  await setup(page, ["amenity:study_desk", "amenity:water_heater_electric", "amenity:parking", "amenity:washer", "amenity:balcony", "amenity:ac_all_rooms"]);
  for (const width of [2048, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 2048 ? 938 : 1166 });
    await expect.poll(() => cardKeys(page).then((keys) => keys.length > 6)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => zone(page).evaluate((area) => {
      const bounds = area.getBoundingClientRect();
      const chips = Array.from(area.querySelectorAll("[data-badge-key]"));
      const insideX = chips.every((chip) => {
        const badge = chip.getBoundingClientRect();
        return badge.left >= bounds.left - 1 && badge.right <= bounds.right + 1;
      });
      return insideX && bounds.height <= 120 && bounds.height >= 60;
    })).toBe(true);
    await expect(page.getByTestId("list-card-preview")).toHaveCount(1);
    await expect(grid(page).locator("[data-badge-handle]")).toHaveCount(0);
    if (width >= 1440) {
      const heading = await page.getByTestId("card-customization-heading").boundingBox();
      const list = await page.getByTestId("list-card-preview").boundingBox();
      const card = await grid(page).boundingBox();
      const media = await page.getByTestId("listing-grid-media").boundingBox();
      const footer = await page.getByTestId("create-wizard-footer").boundingBox();
      expect(list!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height - 1);
      expect(card!.y).toBeGreaterThanOrEqual(list!.y + list!.height - 1);
      expect(list!.width).toBeGreaterThan(card!.width);
      expect(list!.width).toBeGreaterThan(480);
      expect(media!.width / media!.height).toBeCloseTo(16 / 10, 1);
      expect(card!.height / card!.width).toBeLessThan(1.2);
      expect(footer!.height).toBeLessThanOrEqual(82);
      expect(footer!.y).toBeGreaterThan(card!.y);
      await expect(page.getByTestId("create-wizard-footer").getByText(/^Credits/)).toBeVisible();
      await expect(page.getByTestId("create-wizard-footer").getByRole("button", { name: "Publish listing" })).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(`review-${width}.png`) });
  }
});

test("saved order stays first and every other eligible badge is appended", async ({ page }) => {
  await setup(page, ["invalid", ...initialKeys, initialKeys[0], "solar", "ups_wifi", "water_24"]);
  const keys = await cardKeys(page);
  expect(keys.slice(0, 7)).toEqual([...initialKeys, "solar", "ups_wifi", "water_24"]);
  expect(keys).not.toContain("invalid");
  expect(keys.length).toBeGreaterThan(7);
});

test("phone touch reorder stays on the list card", async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: process.env.SKOUN_TEST_URL ?? "http://localhost:8082", viewport: { width: 390, height: 1200 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await setup(page);
  const before = await cardKeys(page);
  const arrange = zone(page).getByRole("button", { name: /^Arrange Walk to campus/ });
  await arrange.scrollIntoViewIfNeeded();
  await arrange.tap();
  await zone(page).getByRole("button", { name: "Move Walk to campus later" }).tap();
  await expect.poll(() => cardKeys(page)).toEqual([before[1], before[0], ...before.slice(2)]);
  await expect(zone(page).getByRole("button", { name: /^Remove / })).toHaveCount(0);
  await expect(grid(page).locator("[data-badge-handle]")).toHaveCount(0);
  const session = await context.newCDPSession(page);
  const from = handle(page, before[0]);
  const firstChip = zone(page).locator("[data-badge-key]").first();
  await firstChip.scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const start = await point(from);
  const chip = await firstChip.boundingBox();
  if (!chip) throw new Error("First badge is missing");
  const target = { x: chip.x + chip.width * 0.25, y: chip.y + chip.height / 2 };
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
  for (let i = 1; i <= 10; i++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (target.x - start.x) * i / 10, y: start.y + (target.y - start.y) * i / 10 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => cardKeys(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath("review-touch.png") });
  await context.close();
});
