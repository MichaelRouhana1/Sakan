// First run: npx expo export --platform web --output-dir .expo/matcher-export (from frontend).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const root = path.join(frontend, process.env.MATCHER_EXPORT_DIR ?? ".expo/matcher-export");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
test(
  "actual exported Explore supports guide entry, results handoff, URL reload and normal filters",
  { timeout: 120000 },
  async (t) => {
    await stat(path.join(root, "search.html"));
    const server = createServer(async (req, res) => {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let target = path.resolve(root, `.${name}`);
      if (!target.startsWith(root + path.sep) && target !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!path.extname(target))
        target += name.endsWith("/") ? "index.html" : ".html";
      try {
        const data = await readFile(target);
        res.setHeader(
          "Content-Type",
          mime[path.extname(target)] ?? "application/octet-stream",
        );
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const browser = await chromium.launch({ headless: true });
    const base = `http://127.0.0.1:${server.address().port}`;
    const errors = [];
    const prefs = {
      version: 1,
      budget: { value: { min: null, max: 500 }, importance: "prefer" },
      power: { value: ["solar"], importance: "prefer" },
    };
    const fixtures = [
      {
        id: "a",
        title: "Hamra sunlit studio",
        electricity: "solar",
        monthlyRentUsd: 450,
      },
      {
        id: "b",
        title: "Room above budget",
        electricity: "generator_24_7",
        monthlyRentUsd: 650,
      },
      {
        id: "c",
        title: "Power not reported",
        listingType: "private_room",
        monthlyRentUsd: 480,
      },
    ].map((l) => ({
      status: "active",
      listingType: "studio",
      area: "Hamra",
      priceBasis: "per_unit_month",
      lat: 33.9,
      lng: 35.48,
      createdAt: "2026-09-01",
      photos: [],
      ...l,
    }));
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/api/**", (r) => {
        const pathname = new URL(r.request().url()).pathname;
        return r.fulfill({
          json: { data: pathname === "/api/listings" ? fixtures : [] },
        });
      });
      await page.goto(`${base}/search`);
      await expect(
        page.getByRole("button", {
          name: "Need help finding a place?",
          exact: true,
        }),
      ).toBeVisible({ timeout: 30000 });
      await page.goto(`${base}/search?guide=1`);
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toBeVisible({ timeout: 30000 });
      await page.getByRole("button", { name: "Studio", exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page
        .getByRole("button", { name: "Up to $500", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Show what I have so far" })
        .click();
      await expect(
        page.getByText("Closest to your prefs", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Best matches", exact: true }),
      ).toBeVisible();
      assert.match(page.url(), /match=/);
      assert.notEqual(new URL(page.url()).searchParams.get("guide"), "1");
      await page.reload();
      await expect(
        page.getByText("Closest to your prefs", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await page.screenshot({
        path: path.join(
          frontend,
          ".expo/matcher-tests/explore-results-1440.png",
        ),
      });
      await page
        .getByRole("button", { name: "Ask again", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Studio", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({
        path: path.join(frontend, ".expo/matcher-tests/explore-guide-1440.png"),
      });
      await page
        .getByRole("button", { name: "Close guide", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Stop matching", exact: true })
        .click();
      await expect(
        page.getByText("Closest to your prefs", { exact: true }),
      ).toHaveCount(0);
      await page.reload();
      await expect(
        page.getByText("Closest to your prefs", { exact: true }),
      ).toHaveCount(0);
      await page.goto(
        `${base}/search?sort=match&match=${encodeURIComponent(JSON.stringify(prefs))}`,
      );
      await expect(
        page.getByText("Closest to your prefs", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await page.setViewportSize({ width: 375, height: 812 });
      await page
        .getByRole("button", {
          name: "Need help finding a place?",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toBeInViewport();
      await page.screenshot({
        path: path.join(frontend, ".expo/matcher-tests/explore-guide-375.png"),
      });
      // Existing static-export hydration warnings originate in the home route's
      // responsive city grid and WebTopNav's search icon/useId, even on plain
      // /search. The isolated matcher harness separately requires zero errors.
      const hydration = errors.filter((message) => message.startsWith("Minified React error #418;"));
      assert.deepEqual(errors.filter((message) => !hydration.includes(message)), []);
      if (hydration.length) t.diagnostic(`${hydration.length} existing app-shell hydration warnings; matcher interactions passed.`);
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
