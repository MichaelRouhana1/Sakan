// Run from repo root: node --test frontend/tests/price-guide.test.mjs
// Bundles the real Pricing step and query hook with test-only auth/draft contexts.
// No authentication bypass, fixture route, or server is added to the product.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import { chromium, expect } from "@playwright/test";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(frontend, ".expo/price-guide-tests");
const guide = { n: 10, lowUsd: 325, medianUsd: 550, highUsd: 775, match: "area_space_beds_basis" };

test("Pricing guidance UI", async (t) => {
  await mkdir(output, { recursive: true });
  const bundle = await build({
    entryPoints: [path.join(frontend, "tests/price-guide-harness.tsx")],
    absWorkingDir: frontend, bundle: true, write: false, platform: "browser",
    jsx: "automatic", define: { "process.env.NODE_ENV": '"test"', __DEV__: "false" },
    alias: { "react-native": "react-native-web" },
    plugins: [{ name: "test-boundaries", setup(builder) {
      builder.onResolve({ filter: /^@\/features\/(auth\/AuthSessionProvider|listings\/create\/CreateListingProvider)$/ },
        () => ({ path: path.join(frontend, "tests/price-guide-harness.tsx") }));
      builder.onResolve({ filter: /^(@\/lib\/api|@\/components\/lister\/Enter|expo-haptics|@expo\/vector-icons)$/ },
        (args) => ({ path: args.path, namespace: "test-boundary" }));
      builder.onLoad({ filter: /.*/, namespace: "test-boundary" }, (args) => ({
        resolveDir: frontend, loader: "tsx", contents:
          args.path === "@/lib/api" ? 'import axios from "axios"; export const api = axios.create();' :
          args.path.endsWith("/Enter") ? 'export const Enter = ({children}) => children;' :
          args.path === "expo-haptics" ? 'export const ImpactFeedbackStyle = {Light:"light"}; export async function impactAsync() {}' :
          'export const Ionicons = () => null;',
      }));
    } }],
  });
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @font-face{font-family:DMSans_400Regular;src:url('/font-400.ttf')}
      @font-face{font-family:DMSans_600SemiBold;src:url('/font-600.ttf')}
      *{box-sizing:border-box}body{margin:0;background:#F9FAFB;font-family:DMSans_400Regular}
      main{max-width:560px;margin:24px auto;padding:24px}#controls{display:flex;flex-wrap:wrap;gap:8px}
      output{display:none}
    </style><div id="root"></div><script src="/app.js"></script>`;
  const server = createServer(async (req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents);
    } else if (req.url?.startsWith("/font-")) {
      const weight = req.url.includes("600") ? "600SemiBold" : "400Regular";
      try {
        res.setHeader("Content-Type", "font/ttf");
        res.end(await readFile(path.join(frontend, `node_modules/@expo-google-fonts/dm-sans/${weight}/DMSans_${weight}.ttf`)));
      } catch { res.statusCode = 404; res.end(); }
    } else { res.setHeader("Content-Type", "text/html"); res.end(html); }
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
    async function pageFor(handler, viewport = { width: 1440, height: 1200 }) {
      const page = await browser.newPage({ viewport });
      page.on("pageerror", (err) => assert.fail(err.message));
      await page.route("**/api/listings/price-guide?**", handler);
      await page.goto(base);
      await expect(page.getByRole("textbox", { name: "Monthly rent in USD", exact: true })).toBeVisible();
      return page;
    }
    await t.test("populated card, keyboard application, manual override and responsive layout", async () => {
      for (const width of [1440, 375]) {
        let calls = 0;
        const page = await pageFor((r) => { calls++; return r.fulfill({ json: { data: guide } }); }, { width, height: 1200 });
        await expect(page.getByTestId("price-guide")).toBeVisible();
        await expect(page.getByText("Often $325–$775 / month")).toBeVisible();
        await expect(page.getByText("Median $550 · based on 10 live listings")).toBeVisible();
        await expect(page.getByText("Per unit", { exact: true })).toBeVisible();
        const before = JSON.parse(await page.getByTestId("draft-state").textContent());
        await page.getByRole("button", { name: "Use $550", exact: true }).focus();
        await page.keyboard.press("Enter");
        const rent = page.getByRole("textbox", { name: "Monthly rent in USD", exact: true });
        await expect(rent).toHaveValue("550");
        const after = JSON.parse(await page.getByTestId("draft-state").textContent());
        assert.deepEqual(after, { ...before, monthlyRentUsd: "550" });
        await rent.fill("1234");
        await expect(rent).toHaveValue("1234");
        assert.equal(calls, 1, "typing rent does not refetch guidance");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.evaluate(() => document.fonts.ready);
        await page.locator("main").screenshot({ path: path.join(output, `pricing-${width}.png`) });
        await page.close();
      }
    });

    await t.test("null, absent, forbidden, server and network errors render no guide or gap", async () => {
      let baseline;
      for (const state of ["null", "absent", "403", "500", "network"]) {
        let calls = 0;
        const page = await pageFor((route) => {
          calls++;
          return state === "network" ? route.abort() : route.fulfill({
            status: state === "403" ? 403 : state === "500" ? 500 : 200,
            json: state === "absent" ? {} : { data: null },
          });
        });
        await expect.poll(() => calls).toBe(1);
        await expect(page.getByTestId("price-guide")).toHaveCount(0);
        const box = await page.getByText("Security deposit", { exact: true }).boundingBox();
        baseline ??= box.y;
        assert.equal(box.y, baseline);
        await page.getByRole("textbox", { name: "Monthly rent in USD", exact: true }).fill("820");
        await page.waitForTimeout(1100); // Exceed React Query's first retry delay.
        assert.equal(calls, 1, state);
        await page.close();
      }
    });

    await t.test("hide initial loading and cancel old results after draft changes", async () => {
      let release;
      const waiting = new Promise((resolve) => { release = resolve; });
      const page = await pageFor(async (route) => {
        const area = new URL(route.request().url()).searchParams.get("area");
        if (area === "Hamra") await waiting;
        await route.fulfill({ json: { data: area === "Hamra" ? guide : null } }).catch(() => {});
      });
      await expect(page.getByTestId("price-guide")).toHaveCount(0);
      await page.getByRole("button", { name: "Change area", exact: true }).click();
      release();
      await page.waitForTimeout(150);
      await expect(page.getByTestId("price-guide")).toHaveCount(0);
      await page.close();
    });

    await t.test("matching inputs, user switches, invalid inputs and sign-out remove earlier guide", async () => {
      for (const action of ["Change area", "Change bedrooms", "Change property", "Change space and basis", "Clear area", "Switch user", "Sign out"]) {
        let calls = 0;
        const page = await pageFor((route) => route.fulfill({ json: { data: ++calls === 1 ? guide : null } }));
        await expect(page.getByTestId("price-guide")).toBeVisible();
        await page.getByRole("button", { name: action, exact: true }).click();
        await expect(page.getByTestId("price-guide")).toHaveCount(0);
        assert.equal(calls, action === "Sign out" || action === "Clear area" ? 1 : 2, action);
        await page.close();
      }
    });

    await t.test("failed refetch hides cached data and remount requests a fresh guide", async () => {
      let calls = 0;
      const page = await pageFor((route) => route.fulfill({ status: ++calls === 2 ? 403 : 200, json: { data: guide } }));
      await expect(page.getByTestId("price-guide")).toBeVisible();
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect(page.getByTestId("price-guide")).toHaveCount(0);
      await page.getByRole("button", { name: "Toggle pricing", exact: true }).click();
      await page.getByRole("button", { name: "Toggle pricing", exact: true }).click();
      await expect(page.getByTestId("price-guide")).toBeVisible();
      assert.equal(calls, 3);
      await page.close();
    });
  } finally {
    await browser?.close();
    server.close();
    await once(server, "close");
  }
});
