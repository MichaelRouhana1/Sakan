// Run from repo root: node --test frontend/tests/copy-suggest.test.mjs
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
const output = path.join(frontend, ".expo/copy-suggest-tests");
const coreBuild = await build({
  stdin: { contents: 'export * from "./features/listings/create/listingCopyTemplates"; export * from "./features/listings/create/listingCopyFacts"; export * from "./features/listings/create/draft";', resolveDir: frontend },
  bundle: true, write: false, format: "esm", platform: "node", absWorkingDir: frontend,
});
const core = await import(`data:text/javascript;base64,${Buffer.from(coreBuild.outputFiles[0].contents).toString("base64")}`);

test("facts snapshot preserves unknowns, derives deposits and excludes private draft data", () => {
  const draft = { ...core.INITIAL_DRAFT, monthlyRentUsd: "720", contactName: "secret", title: "manual", description: "manual" };
  for (const [depositPreset, expected] of [["none", 0], ["1", 720], ["2", 1440], ["custom", 123]]) {
    const facts = core.listingCopyFacts({ ...draft, depositPreset, securityDepositUsd: "123" });
    assert.equal(facts.securityDepositUsd, expected);
    for (const field of ["photos", "pin", "contactName", "contactPhone", "title", "description", "addressLine", "cardBadges"]) assert.equal(field in facts, false, field);
  }
  assert.equal(core.listingCopyFacts({ ...draft, monthlyRentUsd: "", depositPreset: "1" }).securityDepositUsd, null);
  assert.equal(core.listingCopyFacts({ ...draft, depositPreset: "custom", securityDepositUsd: "" }).securityDepositUsd, null);
  assert.equal(core.listingCopyFacts(core.INITIAL_DRAFT).electricity, null);
  assert.equal(core.listingCopyFacts({ ...draft, primaryCampusId: "selected" }, { id: "other", name: "Wrong" }).campusName, null);
  assert.equal(core.listingCopyFacts({ ...draft, primaryCampusId: "selected" }, { id: "selected", name: "LAU Beirut" }).campusName, "LAU Beirut");
  assert.equal(core.replaceDescriptionBrief("Old first.\n\nKeep the detail exactly.\n\nLast.", "New brief."), "New brief.\n\nKeep the detail exactly.\n\nLast.");
});

test("Copy step interactions", async (t) => {
  await mkdir(output, { recursive: true });
  const bundle = await build({
    entryPoints: [path.join(frontend, "tests/copy-suggest-harness.tsx")],
    absWorkingDir: frontend, bundle: true, write: false, platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"test"', __DEV__: "false" }, alias: { "react-native": "react-native-web" },
    plugins: [{ name: "test-boundaries", setup(builder) {
      builder.onResolve({ filter: /^@\/features\/(auth\/AuthSessionProvider|listings\/create\/CreateListingProvider)$/ }, () => ({ path: path.join(frontend, "tests/copy-suggest-harness.tsx") }));
      builder.onResolve({ filter: /^(@\/lib\/api|@\/components\/lister\/Enter|@\/features\/universities\/useUniversities)$/ }, (args) => ({ path: args.path, namespace: "test-boundary" }));
      builder.onLoad({ filter: /.*/, namespace: "test-boundary" }, (args) => ({ resolveDir: frontend, loader: "tsx", contents:
        args.path === "@/lib/api" ? 'import axios from "axios"; export const api = axios.create();' :
        args.path.endsWith("/Enter") ? 'export const Enter = ({children}) => children;' :
        'export const useUniversities = () => ({data: []});',
      }));
    } }],
  });
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
    @font-face{font-family:DMSans_400Regular;src:url('/font-400.ttf')}
    @font-face{font-family:DMSans_600SemiBold;src:url('/font-600.ttf')}
    *{box-sizing:border-box}body{margin:0;background:#F9FAFB;font-family:DMSans_400Regular}
    main{max-width:600px;margin:24px auto;padding:24px}h1{color:#121826;font-size:36px;margin:0 0 24px}
    #controls{display:flex;gap:8px;flex-wrap:wrap}output{display:none}
    </style><div id="root"></div><script src="/app.js"></script>`;
  const server = createServer(async (req, res) => {
    if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents); }
    else if (req.url?.startsWith("/font-")) {
      const weight = req.url.includes("600") ? "600SemiBold" : "400Regular";
      res.setHeader("Content-Type", "font/ttf");
      res.end(await readFile(path.join(frontend, `node_modules/@expo-google-fonts/dm-sans/${weight}/DMSans_${weight}.ttf`)));
    } else { res.setHeader("Content-Type", "text/html"); res.end(html); }
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const reply = (route, source = "template") => {
    const { facts, mode } = route.request().postDataJSON();
    return route.fulfill({ json: { data: core.selectCopy(core.generateListingCopy(facts), mode, source) } });
  };
  try {
    browser = await chromium.launch();
    const pageFor = async (handler = reply, width = 1440) => {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      page.on("pageerror", (e) => assert.fail(e.message));
      await page.route("**/api/listings/copy-suggest", handler);
      await page.goto(base);
      await expect(page.getByRole("textbox", { name: "Listing title", exact: true })).toBeVisible();
      return page;
    };
    await t.test("two taps fill empty copy, keyboard actions, private facts excluded and mobile layout", async () => {
      for (const width of [375, 1440]) {
        const requests = [];
        const page = await pageFor((r) => { requests.push(r.request().postDataJSON()); return reply(r); }, width);
        await page.getByRole("button", { name: "Suggest title", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("textbox", { name: "Listing title", exact: true })).toHaveValue(/apartment in Hamra/i);
        await page.getByRole("button", { name: "Suggest full description", exact: true }).click();
        await expect(page.getByRole("textbox", { name: "Listing description", exact: true })).toHaveValue(/scheduled cuts/);
        assert.equal(requests.length, 2);
        assert.ok(!JSON.stringify(requests).includes("PRIVATE"));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.evaluate(() => document.fonts.ready);
        await page.locator("main").screenshot({ path: path.join(output, `copy-${width}.png`) });
        await page.close();
      }
    });
    await t.test("existing text requires confirmation; brief preserves details; everything remains editable", async () => {
      const page = await pageFor();
      const title = page.getByRole("textbox", { name: "Listing title", exact: true });
      const description = page.getByRole("textbox", { name: "Listing description", exact: true });
      await title.fill("My carefully written title");
      await page.getByRole("button", { name: "Suggest title", exact: true }).click();
      await expect(page.getByRole("button", { name: "Replace title", exact: true })).toBeVisible();
      await expect(title).toHaveValue("My carefully written title");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(title).toHaveValue("My carefully written title");
      await description.fill("Old opening.\n\nKeep this paragraph exactly.\n\nAnd this one.");
      await page.getByRole("button", { name: "Suggest brief", exact: true }).click();
      await page.getByRole("button", { name: "Replace first paragraph", exact: true }).click();
      await expect(description).toHaveValue(/^Apartment in Hamra.*\n\nKeep this paragraph exactly\.\n\nAnd this one\.$/s);
      await page.getByRole("button", { name: "Suggest full description", exact: true }).click();
      await page.getByRole("button", { name: "Replace description", exact: true }).click();
      await expect(description).not.toHaveValue(/Keep this paragraph/);
      await description.fill("Host edited this freely after the suggestion.");
      await expect(description).toHaveValue("Host edited this freely after the suggestion.");
      await page.close();
    });
    await t.test("AI attribution is quiet, while template fallback does not claim AI", async () => {
      const page = await pageFor((r) => reply(r, "gemini"), 375);
      await page.getByRole("button", { name: "Suggest brief", exact: true }).click();
      await expect(page.getByText("AI suggestion — edit before publishing", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Suggest brief", exact: true }).click();
      await expect(page.getByRole("button", { name: "Replace first paragraph", exact: true })).toBeVisible();
      await page.locator("main").screenshot({ path: path.join(output, "copy-preview-375.png") });
      await page.close();
      for (const failure of ["network", "500", "401", "429", "malformed"]) {
        const p = await pageFor((r) => failure === "network" ? r.abort() : r.fulfill({ status: failure === "malformed" ? 200 : Number(failure), json: {} }));
        await p.getByRole("button", { name: "Suggest full description", exact: true }).click();
        await expect(p.getByRole("textbox", { name: "Listing description", exact: true })).toHaveValue(/Apartment in Hamra/);
        await expect(p.getByText("AI suggestion — edit before publishing", { exact: true })).toHaveCount(0);
        await p.close();
      }
    });
    await t.test("loading never locks typing; changed text, facts, session and unmount discard delayed results", async () => {
      for (const change of ["edit", "Change area", "Switch user", "Sign out", "Toggle copy", "roundtrip"]) {
        let release;
        const wait = new Promise((resolve) => { release = resolve; });
        let requested = false;
        const page = await pageFor(async (r) => { requested = true; await wait; await reply(r).catch(() => {}); });
        const title = page.getByRole("textbox", { name: "Listing title", exact: true });
        await page.getByRole("button", { name: "Suggest title", exact: true }).click();
        await expect.poll(() => requested).toBe(true);
        await expect(page.getByRole("button", { name: "Suggest title", exact: true })).toHaveAttribute("aria-busy", "true");
        await expect(page.getByRole("button", { name: "Suggest brief", exact: true })).toBeDisabled();
        await expect(title).toBeEditable();
        if (change === "edit") await title.fill("Typing while waiting");
        else if (change === "roundtrip") {
          await page.getByRole("button", { name: "Change area", exact: true }).click();
          await page.getByRole("button", { name: "Restore area", exact: true }).click();
        } else await page.getByRole("button", { name: change, exact: true }).click();
        release();
        await page.waitForTimeout(150);
        if (change === "Toggle copy") await page.getByRole("button", { name: change, exact: true }).click();
        await expect(title).toHaveValue(change === "edit" ? "Typing while waiting" : "");
        await expect(page.getByRole("button", { name: "Replace title", exact: true })).toHaveCount(0);
        await page.close();
      }
    });
    await t.test("editing while a preview is open invalidates it; long retained text is not truncated", async () => {
      const page = await pageFor();
      const title = page.getByRole("textbox", { name: "Listing title", exact: true });
      await title.fill("Manual listing title");
      await page.getByRole("button", { name: "Suggest title", exact: true }).click();
      await expect(page.getByRole("button", { name: "Replace title", exact: true })).toBeVisible();
      await title.fill("More recent host title");
      await expect(page.getByRole("button", { name: "Replace title", exact: true })).toHaveCount(0);
      const description = page.getByRole("textbox", { name: "Listing description", exact: true });
      const original = "Old.\n\n" + "Details ".repeat(498);
      await description.fill(original);
      await page.getByRole("button", { name: "Suggest brief", exact: true }).click();
      await page.getByRole("button", { name: "Replace first paragraph", exact: true }).click();
      await expect(page.getByText(/This would exceed 4,000 characters/)).toBeVisible();
      await expect(description).toHaveValue(original);
      await page.close();
    });
  } finally {
    await browser?.close(); server.close(); await once(server, "close");
  }
});
