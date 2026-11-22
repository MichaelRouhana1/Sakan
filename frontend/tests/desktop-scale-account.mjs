import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { signIn, apiRequest } from "./creation-wizard-auth.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const scratch = path.join(root, "frontend/.expo/desktop-scale-account");
const output = path.join(root, "artifacts/desktop-scale/account");
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
const base = process.env.STUDENTLY_TEST_URL ?? "http://127.0.0.1:8081";
const api = "http://127.0.0.1:3001";

const shots = [
  { name: "profile", path: "/profile", sample: ["Browse as yourself", "Account"] },
  { name: "saved", path: "/saved", sample: ["Saved listings", "Nothing saved yet", "Sign in to see saved listings"] },
];

function launch() {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  return chromium.launch({ headless: true, channel }).catch(() => chromium.launch({ headless: true }));
}

async function fit(page) {
  const width = page.viewportSize().width;
  await page.setViewportSize({ width, height: 1100 });
  await page.waitForTimeout(80);
  const height = await page.evaluate(() => {
    const shell = document.getElementById("studently-web-shell");
    if (shell) {
      shell.style.height = "auto";
      shell.style.maxHeight = "none";
      shell.style.overflow = "visible";
    }
    const footer = document.querySelector("footer");
    const profile = document.getElementById("studently-profile");
    const bottom = Math.max(footer?.getBoundingClientRect().bottom ?? 0, profile?.getBoundingClientRect().bottom ?? 0, 700);
    return Math.ceil(bottom + 28);
  });
  const next = Math.min(Math.max(height, 800), 9000);
  await page.setViewportSize({ width, height: next });
  await page.waitForTimeout(120);
  return next;
}

const browser = await launch();
const report = { pages: {}, errors: [] };
try {
  const setup = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await setup.newPage();
  await signIn(page, base);
  await page.waitForURL(/draftId=/, { timeout: 60000 }).catch(() => {});
  const stray = new URL(page.url()).searchParams.get("draftId");
  if (stray) await apiRequest(page, api, `/api/listings/creation-drafts/${stray}`, "DELETE").catch(() => {});
  const storage = await setup.storageState();
  for (const origin of storage.origins ?? []) {
    origin.localStorage = (origin.localStorage ?? []).filter((item) => item.name !== "studently.homepageScale");
  }
  await setup.close();

  for (const factor of ["1", "1.1"]) {
    const width = factor === "1" ? 1440 : Math.round(1440 / 0.9);
    const context = await browser.newContext({
      viewport: { width, height: 1100 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      storageState: storage,
    });
    await context.addInitScript((value) => localStorage.setItem("studently.homepageScale", value), factor);
    const view = await context.newPage();
    view.on("pageerror", (error) => report.errors.push(`${factor} ${error.message}`));
    try {
      for (const shot of shots) {
        try {
          await view.setViewportSize({ width, height: 1100 });
          await view.goto(`${base}${shot.path}`, { timeout: 120000, waitUntil: "domcontentloaded" });
          await expect(view.getByText(shot.name === "profile" ? "Account" : /saved listings/i).first()).toBeVisible({ timeout: 90000 });
          await view.evaluate(() => document.fonts.ready);
          await view.waitForTimeout(400);
          const fitted = await fit(view);
          const metrics = await view.evaluate((needles) => {
            const text = (value) => [...document.querySelectorAll("div, span, p, h1")].find((el) => el.childElementCount === 0 && el.textContent.trim() === value);
            const box = (el) => {
              if (!el) return null;
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return { font: parseFloat(style.fontSize) || null, h: Math.round(rect.height * 10) / 10, w: Math.round(rect.width * 10) / 10 };
            };
            const sample = needles.map((value) => text(value)).find(Boolean);
            return {
              attr: document.querySelector("[data-desktop-scale]")?.getAttribute("data-desktop-scale") ?? "",
              brand: box(text("Studently")),
              sample: box(sample),
              columns: null,
            };
          }, shot.sample);
          const file = path.join(scratch, `${shot.name}-${factor}.png`);
          await view.screenshot({ path: file, fullPage: true, animations: "disabled" });
          report.pages[shot.name] ??= {};
          report.pages[shot.name][factor] = { metrics, file };
          console.log(`${shot.name} ${factor} h ${fitted} brand ${metrics.brand?.font ?? "none"} sample ${metrics.sample?.font ?? "none"} attr ${metrics.attr}`);
        } catch (error) {
          const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
          report.errors.push(`${shot.name} ${factor} ${message}`);
          console.log(`${shot.name} ${factor} FAILED ${message}`);
        }
      }
    } finally {
      await context.close();
    }
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
  console.error(error);
} finally {
  await browser.close();
}

await writeFile(path.join(scratch, "report.json"), JSON.stringify(report, null, 2));
if (!Object.keys(report.pages).length) {
  console.log(JSON.stringify(report.errors, null, 2));
  process.exit(1);
}
const py = spawn("python", [path.join(import.meta.dirname, "desktop-scale-public-diff.py"), scratch, output], { stdio: "inherit" });
const code = await new Promise((resolve) => py.on("close", resolve));
if (report.errors.length) console.log(JSON.stringify(report.errors, null, 2));
if (code !== 0) process.exit(code ?? 1);
