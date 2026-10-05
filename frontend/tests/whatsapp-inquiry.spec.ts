import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    inquiryTest: { opened: string[]; blocked: boolean; openerCleared: boolean };
  }
}

const listing = {
  id: "inquiry-test", posterId: "test-host", status: "active", availability: "available",
  listingType: "studio", title: "Bright studio in Hamra", area: "Hamra", monthlyRentUsd: 650,
  whatsappNumber: "+96171123456", contactPhone: "+96171123456", contactName: "Test host",
  listingPosterRole: "landlord", targetAudience: "students_professionals", photos: [],
  description: "A comfortable home near campus.", amenities: [], createdAt: "2026-10-01",
};

async function setup(page: Page, overrides: Record<string, unknown> = {}, analyticsFails = false) {
  let taps = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/contact-tap")) {
      taps++;
      await route.fulfill({ status: analyticsFails ? 500 : 200, json: { data: {} } });
    } else {
      await route.fulfill({ json: { data: path === "/api/listings/inquiry-test" ? { ...listing, ...overrides } : [] } });
    }
  });
  await page.addInitScript(() => {
    window.inquiryTest = { opened: [], blocked: false, openerCleared: false };
    window.open = (() => {
      if (window.inquiryTest.blocked) return null;
      const tab = {
        opener: window as Window | null,
        location: { replace: (url: string) => {
          window.inquiryTest.openerCleared = tab.opener === null;
          window.inquiryTest.opened.push(url);
        } },
        close: () => {},
      };
      return tab as unknown as Window;
    }) as typeof window.open;
  });
  await page.goto("/listing/inquiry-test");
  await expect(page.getByText("Bright studio in Hamra").first()).toBeVisible();
  return () => taps;
}

const dialog = (page: Page) => page.getByTestId("whatsapp-inquiry-dialog");
const contact = (page: Page) => page.getByRole("button", { name: /^(WhatsApp the poster|Contact on WhatsApp)$/ });
const opened = (page: Page) => page.evaluate(() => window.inquiryTest.opened);
const openButton = (page: Page) => page.getByRole("button", { name: "Open WhatsApp", exact: true });

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}px layout`, () => {
    test.use({ viewport });

    test("live preview, exact URL, one lead and analytics failure does not block", async ({ page }) => {
      const taps = await setup(page, {}, true);
      await contact(page).click();
      await expect(dialog(page)).toBeVisible();
      expect(await opened(page)).toEqual([]);
      expect(taps()).toBe(0);
      await page.getByTestId("whatsapp-inquiry-moveInDate").fill(" mid-November ");
      await page.getByTestId("whatsapp-inquiry-household").fill("2 students — ليلى & Zoë");
      await page.getByTestId("whatsapp-inquiry-rentAcceptance").fill("Yes + utilities?");
      const preview = await page.getByTestId("whatsapp-preview-text").innerText();
      expect(preview).toContain("move-in date: mid-November");
      expect(preview).toContain("2 students — ليلى & Zoë");
      await page.screenshot({ path: test.info().outputPath("inquiry-filled.png"), fullPage: true });
      await openButton(page).click();
      await expect(dialog(page)).toBeHidden();
      const urls = await opened(page);
      expect(urls).toHaveLength(1);
      expect(new URL(urls[0]).searchParams.get("text")).toBe(preview);
      expect(await page.evaluate(() => window.inquiryTest.openerCleared)).toBe(true);
      await expect.poll(taps).toBe(1);
    });

    test("empty Open works, Skip discards typed answers, each new sheet resets", async ({ page }) => {
      const taps = await setup(page);
      await contact(page).click();
      const empty = await page.getByTestId("whatsapp-preview-text").innerText();
      await openButton(page).click();
      await expect(dialog(page)).toBeHidden();
      await contact(page).click();
      await page.getByTestId("whatsapp-inquiry-household").fill("Do not send me");
      await page.getByRole("button", { name: "Skip — message anyway", exact: true }).click();
      await expect(dialog(page)).toBeHidden();
      const urls = await opened(page);
      expect(urls).toHaveLength(2);
      for (const url of urls) expect(new URL(url).searchParams.get("text")).toBe(empty);
      await expect.poll(taps).toBe(2);
      await contact(page).click();
      await expect(page.getByTestId("whatsapp-inquiry-household")).toHaveValue("");
    });

    test("Close, Escape and backdrop cancel; focus stays in modal and returns to CTA", async ({ page }) => {
      const taps = await setup(page);
      for (const method of ["close", "escape", "backdrop"]) {
        await contact(page).focus();
        await contact(page).press("Enter");
        await expect(dialog(page)).toBeVisible();
        await page.getByTestId("whatsapp-inquiry-household").fill("discard");
        for (let i = 0; i < 18; i++) {
          await page.keyboard.press(i < 9 ? "Tab" : "Shift+Tab");
          expect(await dialog(page).evaluate((node) => node.contains(document.activeElement))).toBe(true);
        }
        if (method === "close") await page.getByRole("button", { name: "Close inquiry" }).click();
        if (method === "escape") await page.keyboard.press("Escape");
        if (method === "backdrop") await page.getByTestId("whatsapp-inquiry-backdrop").click({ position: { x: 2, y: 2 } });
        await expect(dialog(page)).toBeHidden();
        await expect(contact(page)).toBeFocused();
      }
      expect(await opened(page)).toEqual([]);
      expect(taps()).toBe(0);
    });

    test("blocked handoff preserves answers and retry records just one lead", async ({ page }) => {
      const taps = await setup(page);
      await page.evaluate(() => { window.inquiryTest.blocked = true; });
      await contact(page).click();
      await page.getByTestId("whatsapp-inquiry-household").fill("2 workers");
      await openButton(page).click();
      await expect(page.getByRole("alert")).toContainText("Couldn’t open WhatsApp");
      await expect(page.getByTestId("whatsapp-inquiry-household")).toHaveValue("2 workers");
      expect(taps()).toBe(0);
      await page.evaluate(() => { window.inquiryTest.blocked = false; });
      // Dispatch both clicks in one event-loop turn to exercise the synchronous lock.
      await openButton(page).evaluate((node) => { (node as HTMLElement).click(); (node as HTMLElement).click(); });
      await expect(dialog(page)).toBeHidden();
      expect(await opened(page)).toHaveLength(1);
      await expect.poll(taps).toBe(1);
    });

    test("room-card contact uses the same sheet and pending introduction", async ({ page }) => {
      const taps = await setup(page, { availability: "pending", isPbsa: true, pbsaRoomTypes: [{ id: "room-1", name: "Ensuite room", category: "ensuite", monthlyRentUsd: 450, photos: [], features: [] }] });
      await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
      await expect(dialog(page)).toBeVisible();
      await expect(page.getByText("This listing is under offer. You can still contact the host.")).toBeVisible();
      await expect(page.getByTestId("whatsapp-preview-text")).toContainText("under offer");
      await expect(page.getByTestId("whatsapp-preview-text")).toContainText("$650/mo");
      expect(await opened(page)).toEqual([]);
      expect(taps()).toBe(0);
    });

    test("rented hides active WhatsApp CTAs and leaves Call available", async ({ page }) => {
      await setup(page, { availability: "rented", isPbsa: true });
      await expect(contact(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "WhatsApp", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Call listing|Call the poster)$/ })).toBeVisible();
      await expect(dialog(page)).toBeHidden();
      expect(await opened(page)).toEqual([]);
    });

    test("an unusable WhatsApp phone cannot open the sheet", async ({ page }) => {
      const taps = await setup(page, { whatsappNumber: "123" });
      await expect(contact(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Call listing|Call the poster)$/ })).toBeVisible();
      await expect(dialog(page)).toBeHidden();
      expect(taps()).toBe(0);
    });

    test("a listing that becomes rented closes the sheet without opening or tracking", async ({ page }) => {
      const state = { availability: "available" };
      const taps = await setup(page, state);
      await contact(page).click();
      await page.getByTestId("whatsapp-inquiry-household").fill("2 students");
      state.availability = "rented";
      // Make the cached listing stale and exercise the normal return-to-app refetch.
      await page.clock.setFixedTime(Date.now() + 60_000);
      await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
      await expect(contact(page)).toHaveCount(0);
      await expect(dialog(page)).toBeHidden();
      expect(await opened(page)).toEqual([]);
      expect(taps()).toBe(0);
    });

    test("long answers wrap without horizontal overflow; controls remain reachable", async ({ page }) => {
      await setup(page);
      await contact(page).click();
      await page.getByTestId("whatsapp-inquiry-household").fill("2 students " + "A".repeat(300));
      const preview = page.getByTestId("whatsapp-preview-text");
      await expect(preview).toContainText("A".repeat(300));
      expect(await preview.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await expect(openButton(page)).toBeInViewport();
      await expect(page.getByRole("button", { name: "Skip — message anyway", exact: true })).toBeInViewport();
      await page.getByRole("button", { name: "Close inquiry" }).click();
      await expect(dialog(page)).toBeHidden();
    });
  });
}
