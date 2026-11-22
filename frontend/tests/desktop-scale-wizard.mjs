import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import { env, postgres, signIn, apiRequest } from "./creation-wizard-auth.mjs";
import { fixture } from "./creation-wizard-fixtures.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const frontend = path.resolve(import.meta.dirname, "..");
const scratch = path.join(frontend, ".expo/desktop-scale-wizard");
const output = path.join(root, "artifacts/desktop-scale/host/wizard");
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
const base = process.env.STUDENTLY_TEST_URL ?? "http://127.0.0.1:8081";
const api = "http://127.0.0.1:3001";

const only = process.env.WIZARD_ONLY?.split(",").map((item) => item.trim()).filter(Boolean);
const steps = [
  ["01-place-type", "place-type", "First, describe the place."],
  ["02-location", "location", "Where is your place?"],
  ["03-utilities", "utilities", "The everyday essentials."],
  ["04-rules", "rules", "Set the house rules."],
  ["05-building-photos", "building-photos", "A first look at the building."],
  ["06-layout", "layout", "A space of their own."],
  ["07-unit-photos", "photos", "Show this unit."],
  ["08-rent", "rent", "Set the rent and terms."],
  ["09-copy", "copy", "Give this unit a story."],
  ["10-another", "another", "Add another unit?"],
  ["11-review", "review", "One place. Ready to share."],
].filter((step) => !only || only.includes(step[1]) || only.includes(step[0]));

const db = new URL(env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || db.pathname !== "/studently_dev") {
  throw new Error("Wizard screenshots require the local studently_dev database");
}
const sql = postgres(db.toString(), { max: 1, onnotice: () => {} });
const [guard] = await sql`SELECT environment, database_name FROM studently_ops.environment_guard WHERE singleton = true`;
assert.equal(guard.environment, "local");
assert.equal(guard.database_name, "studently_dev");

const bundle = await build({
  stdin: { contents: `export * from './features/listings/create/v2/model';`, loader: "ts", resolveDir: frontend },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const model = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].contents).toString("base64"));

function launch() {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  return chromium.launch({ headless: true, channel }).catch(() => chromium.launch({ headless: true }));
}

async function contentHeight(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="creation-wizard"]');
    const stage = document.querySelector('[data-testid="wizard-stage"]');
    if (root) {
      root.style.height = "auto";
      root.style.overflow = "visible";
    }
    if (stage) {
      stage.style.height = "auto";
      stage.style.flex = "none";
      stage.style.overflow = "visible";
      stage.style.minHeight = "0";
    }
    for (const el of stage ? [...stage.querySelectorAll("div")] : []) {
      const style = getComputedStyle(el);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 8) {
        el.style.overflow = "visible";
        el.style.height = `${el.scrollHeight}px`;
        el.style.maxHeight = "none";
        el.style.flex = "none";
        break;
      }
    }
    const screen = document.querySelector('[data-testid^="screen-"]');
    const labels = ["Next", "Skip for now", "Finish unit", "Done — review units", "Publish", "Publish all"];
    const next = [...document.querySelectorAll("button, [role='button'], div")].find((el) => el.childElementCount === 0 && labels.includes(el.textContent.trim()));
    const bottoms = [screen, next].filter(Boolean).map((el) => el.getBoundingClientRect().bottom);
    return Math.ceil(Math.max(...bottoms, 700) + 28);
  });
}

async function fit(page) {
  const width = page.viewportSize().width;
  await page.setViewportSize({ width, height: 1200 });
  await page.waitForTimeout(80);
  let height = 1200;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = Math.min(Math.max(await contentHeight(page), 800), 12000);
    if (Math.abs(next - height) <= 16) return next;
    height = next;
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
  }
  return height;
}

async function metrics(page, title) {
  return page.evaluate((heading) => {
    const text = (value) => [...document.querySelectorAll("div, span, p, h1")].find((el) => el.childElementCount === 0 && el.textContent.trim() === value);
    const box = (el) => {
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { font: parseFloat(style.fontSize) || null, h: Math.round(rect.height * 10) / 10, w: Math.round(rect.width * 10) / 10 };
    };
    const labels = [...document.querySelectorAll("div, span")].filter((el) => el.childElementCount === 0 && el.textContent.trim().startsWith("Good ·"));
    const rows = new Map();
    for (const el of labels) {
      const y = Math.round(el.getBoundingClientRect().top / 40);
      rows.set(y, (rows.get(y) ?? 0) + 1);
    }
    const input = document.querySelector("input, textarea");
    const screen = document.querySelector('[data-testid^="screen-"]');
    return {
      attr: document.querySelector("[data-desktop-scale]")?.getAttribute("data-desktop-scale") ?? "",
      brand: null,
      input: input ? parseFloat(getComputedStyle(input).fontSize) : null,
      sample: box(text(heading)),
      columns: labels.length ? Math.max(...rows.values()) : null,
      guidanceWidth: labels[0] ? Math.round(labels[0].parentElement?.parentElement?.getBoundingClientRect().width ?? 0) : null,
      paddingTop: screen ? parseFloat(getComputedStyle(screen).paddingTop) : null,
    };
  }, title);
}

const browser = await launch();
const report = { pages: {}, errors: [] };
const drafts = new Set();
let setup;
try {
  setup = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await setup.newPage();
  page.on("pageerror", (error) => report.errors.push(`setup ${error.message}`));
  await signIn(page, base);
  await page.waitForURL(/draftId=/, { timeout: 60000 }).catch(() => {});
  const stray = new URL(page.url()).searchParams.get("draftId");
  if (stray) drafts.add(stray);
  const campuses = await apiRequest(page, api, "/api/universities");
  const campus = campuses.find((item) => item.slug === "aub") ?? campuses[0];
  const payload = fixture(model, campus.id, api);
  payload.completedPlace = [...model.PLACE_SCREENS];
  payload.units[0].finished = true;
  payload.reviewVisited = true;
  const created = await apiRequest(page, api, "/api/listings/creation-drafts", "POST", { id: randomUUID(), payload });
  drafts.add(created.id);
  const storage = await setup.storageState();
  for (const origin of storage.origins ?? []) {
    origin.localStorage = (origin.localStorage ?? []).filter((item) => item.name !== "studently.homepageScale");
  }
  await setup.close();
  setup = null;

  let revision = created.revision;
  let body = created.payload;
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
      await view.goto(`${base}/create?draftId=${created.id}`, { timeout: 120000, waitUntil: "domcontentloaded" });
      await view.waitForFunction(() => window.Clerk?.session, undefined, { timeout: 60000 });
      for (const [name, screen, title] of steps) {
        try {
          body = { ...body, position: { ...body.position, screen }, reviewVisited: true };
          const saved = await apiRequest(view, api, `/api/listings/creation-drafts/${created.id}`, "PUT", { payload: body, revision });
          revision = saved.revision;
          body = saved.payload;
          await view.setViewportSize({ width: view.viewportSize().width, height: 1200 });
          await view.goto(`${base}/create?draftId=${created.id}`, { timeout: 120000, waitUntil: "domcontentloaded" });
          await expect(view.getByTestId(`screen-${screen}`)).toBeVisible({ timeout: 90000 });
          if (screen === "review") {
            await view.waitForFunction(() => !document.body.innerText.includes("Checking credit total"), null, { timeout: 15000 }).catch(() => {});
          }
          await view.evaluate(() => document.fonts.ready);
          await view.waitForTimeout(400);
          const fitted = await fit(view);
          const reading = await metrics(view, title);
          const file = path.join(scratch, `${name}-${factor}.png`);
          await view.screenshot({ path: file, fullPage: true, animations: "disabled" });
          report.pages[name] ??= {};
          report.pages[name][factor] = { metrics: reading, file };
          console.log(`${name} ${factor} h ${fitted} title ${reading.sample?.font ?? "none"} input ${reading.input ?? "none"} pad ${reading.paddingTop} columns ${reading.columns} guidance ${reading.guidanceWidth}`);
        } catch (error) {
          const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
          report.errors.push(`${name} ${factor} ${message}`);
          console.log(`${name} ${factor} FAILED ${message}`);
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
  if (setup) await setup.close().catch(() => {});
  if (drafts.size) {
    const cleanup = await browser.newContext();
    const page = await cleanup.newPage();
    try {
      await signIn(page, base);
      await page.waitForURL(/draftId=/, { timeout: 60000 }).catch(() => {});
      const extra = new URL(page.url()).searchParams.get("draftId");
      if (extra) drafts.add(extra);
      for (const id of drafts) {
        await apiRequest(page, api, `/api/listings/creation-drafts/${id}`, "DELETE").catch((error) => {
          report.errors.push(`discard ${id} ${error.message}`);
        });
      }
    } catch (error) {
      report.errors.push(`cleanup ${error instanceof Error ? error.message : error}`);
    }
    await cleanup.close();
  }
  await browser.close();
  await sql.end({ timeout: 5 });
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
