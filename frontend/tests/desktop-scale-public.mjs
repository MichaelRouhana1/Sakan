import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "../..");
const scratch = path.join(root, "frontend/.expo/desktop-scale-public");
const output = path.join(root, "artifacts/desktop-scale/public");
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
const base = process.env.STUDENTLY_TEST_URL ?? "http://127.0.0.1:8081";

function launch() {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  return chromium.launch({ headless: true, channel }).catch(() => chromium.launch({ headless: true }));
}

async function fit(page) {
  let height = 1000;
  for (let pass = 0; pass < 8; pass += 1) {
    const next = await page.evaluate(() => {
      const bottom = [...document.body.querySelectorAll("*")].reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0);
      const shell = document.getElementById("studently-web-shell") || document.getElementById("studently-campus");
      return Math.ceil(Math.max(bottom, shell?.scrollHeight ?? 0) + 24);
    });
    if (Math.abs(next - height) <= 8) return height;
    height = Math.min(Math.max(next, 800), 14000);
    await page.setViewportSize({ width: page.viewportSize().width, height });
    await page.waitForTimeout(250);
  }
  return height;
}

async function ready(page) {
  await page.waitForTimeout(400);
  const crashed = await page.locator("text=Uncaught").count().catch(() => 0);
  if (crashed) throw new Error(await page.locator("body").innerText().then(t => t.slice(0, 500)));
}

const only = process.env.SCALE_ONLY?.split(",").filter(Boolean);
const shots = [
  { name: "search", path: "/search" },
  { name: "search-map", path: "/search", map: true },
  { name: "listing", path: "/search", listing: true },
  { name: "campus", path: "/campus" },
  { name: "campus-calculator", path: "/campus/calculator" },
  { name: "campus-calendar", path: "/campus/calendar" },
  { name: "campus-benefits", path: "/campus/benefits" },
].filter(shot => !only || only.includes(shot.name));

const browser = await launch();
const report = { live: null, pages: {}, errors: [] };
try {
  const live = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await live.addInitScript(() => localStorage.setItem("studently.homepageScale", "1.1"));
  const page = await live.newPage();
  page.on("pageerror", (error) => report.errors.push(`toggle ${error.message}`));
  await page.goto(`${base}/search`, { timeout: 120000, waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Scale 1.1", exact: true })).toBeVisible({ timeout: 90000 });
  const before = page.url();
  const fontBefore = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="homepage"], #studently-web-shell');
    const brand = [...document.querySelectorAll("div")].find(node => node.childElementCount === 0 && node.textContent.trim() === "Studently");
    return { attr: el?.getAttribute("data-desktop-scale"), font: brand ? parseFloat(getComputedStyle(brand).fontSize) : null };
  });
  await page.getByRole("button", { name: "Scale 1.0", exact: true }).click();
  await page.waitForFunction(() => {
    const el = document.querySelector("#studently-web-shell");
    return el?.getAttribute("data-desktop-scale") === "1";
  });
  const fontMid = await page.evaluate(() => {
    const brand = [...document.querySelectorAll("div")].find(node => node.childElementCount === 0 && node.textContent.trim() === "Studently");
    return brand ? parseFloat(getComputedStyle(brand).fontSize) : null;
  });
  await page.getByRole("button", { name: "Scale 1.1", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#studently-web-shell")?.getAttribute("data-desktop-scale") === "1.1");
  report.live = { hrefUnchanged: page.url() === before, fontBefore, fontMid, stored: await page.evaluate(() => localStorage.getItem("studently.homepageScale")) };
  await live.close();

  for (const shot of shots) {
    report.pages[shot.name] = {};
    for (const factor of ["1", "1.1"]) {
      const width = factor === "1" ? 1440 : Math.round(1440 / 0.9);
      const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      await context.addInitScript((value) => localStorage.setItem("studently.homepageScale", value), factor);
      const view = await context.newPage();
      view.on("pageerror", (error) => report.errors.push(`${shot.name} ${factor} ${error.message}`));
      try {
        await view.goto(`${base}${shot.path}`, { timeout: 120000, waitUntil: "domcontentloaded" });
        await view.waitForTimeout(1500);
        if (shot.listing) {
          const testId = await view.locator('[data-testid^="result-card-"]').first().getAttribute("data-testid", { timeout: 30000 });
          const id = testId?.replace(/^result-card-/, "");
          if (!id) throw new Error("no listing card");
          await view.goto(`${base}/listing/${id}`, { timeout: 120000, waitUntil: "domcontentloaded" });
          await view.waitForTimeout(1800);
        }
        if (shot.map) {
          await view.getByRole("button", { name: "Explore on map", exact: true }).click({ timeout: 20000 });
          await view.waitForTimeout(1500);
        }
        await ready(view);
        await fit(view);
        const metrics = await view.evaluate(() => {
          const text = (value) => [...document.querySelectorAll("div, span, p, h1, button")].find(el => el.childElementCount === 0 && el.textContent.trim() === value);
          const box = (el) => {
            if (!el) return null;
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return { font: parseFloat(s.fontSize) || null, h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10 };
          };
          const shell = document.getElementById("studently-web-shell") || document.getElementById("studently-campus");
          return {
            attr: shell?.getAttribute("data-desktop-scale") ?? "",
            brand: box(text("Studently")),
            sample: box(text("Explore on map") || text("Calculator") || text("Academic calendar") || text("Benefits") || document.querySelector("h1")),
            columns: (() => {
              const nodes = [...document.querySelectorAll("div")].filter(el => el.childElementCount === 0 && el.textContent.trim() === "Unlock");
              if (!nodes.length) return null;
              const rows = new Map();
              for (const el of nodes) {
                const y = Math.round(el.getBoundingClientRect().top / 30);
                rows.set(y, (rows.get(y) ?? 0) + 1);
              }
              return Math.max(...rows.values());
            })(),
          };
        });
        const file = path.join(scratch, `${shot.name}-${factor}.png`);
        await view.screenshot({ path: file, fullPage: true, animations: "disabled" });
        report.pages[shot.name][factor] = { metrics, file };
      } catch (error) {
        report.errors.push(`${shot.name} ${factor} ${error.message}`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(scratch, "report.json"), JSON.stringify(report, null, 2));
const py = spawn("python", [path.join(import.meta.dirname, "desktop-scale-public-diff.py"), scratch, output], { stdio: "inherit" });
const code = await new Promise((resolve) => py.on("close", resolve));
console.log(JSON.stringify({ live: report.live, errors: report.errors }, null, 2));
if (code !== 0) process.exit(code ?? 1);
