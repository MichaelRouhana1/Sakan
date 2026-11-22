import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const outDir = process.argv[2];
const label = process.argv[3] ?? "shot";
if (!outDir) throw new Error("output directory required");
await mkdir(outDir, { recursive: true });

function launch() {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  return chromium.launch({ headless: true, channel }).catch(() => chromium.launch({ headless: true }));
}

const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("pageerror", (error) => console.log("pageerror", error.message));
await page.goto("http://127.0.0.1:8081/", { timeout: 120000, waitUntil: "domcontentloaded" });
await page.getByText("Student foyers in Lebanon").first().waitFor({ timeout: 90000 });
await page.waitForTimeout(600);

async function scrollTo(top) {
  const found = await page.evaluate((y) => {
    const root = document.querySelector('[data-testid="homepage"]');
    const nodes = root ? [...root.querySelectorAll("div")] : [...document.querySelectorAll("div")];
    const scroller = nodes.find((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 40;
    });
    if (!scroller) return false;
    scroller.scrollTop = y;
    return true;
  }, top);
  if (!found) throw new Error("homepage scroller not found");
  await page.waitForTimeout(350);
}

async function probe() {
  return page.evaluate(() => {
    const title = [...document.querySelectorAll("div, span")].find((el) => el.childElementCount === 0 && el.textContent.trim() === "Student foyers in Lebanon");
    const header = document.querySelector('[role="banner"], [accessibilityrole="header"]') || [...document.querySelectorAll("div")].find((el) => getComputedStyle(el).position === "absolute" && getComputedStyle(el).zIndex === "40");
    const titleBox = title?.getBoundingClientRect();
    const headerBox = header?.getBoundingClientRect();
    const headerStyle = header ? getComputedStyle(header) : null;
    const overlap = titleBox && headerBox ? titleBox.top < headerBox.bottom && titleBox.bottom > headerBox.top : false;
    const center = [...document.querySelectorAll("input, [role='search'], [data-testid='desktop-scale-toggle']")].map((el) => {
      const box = el.getBoundingClientRect();
      return { tag: el.tagName, test: el.getAttribute("data-testid"), text: el.textContent.trim().slice(0, 40), x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
    });
    return {
      overlap,
      title: titleBox ? { top: Math.round(titleBox.top), bottom: Math.round(titleBox.bottom) } : null,
      header: headerBox ? { bottom: Math.round(headerBox.bottom), bg: headerStyle.backgroundColor, z: headerStyle.zIndex } : null,
      center,
    };
  });
}

await scrollTo(320);
console.log(label, "onset", JSON.stringify(await probe()));
await page.screenshot({ path: path.join(outDir, `${label}-solid-onset.png`) });
await scrollTo(900);
console.log(label, "past", JSON.stringify(await probe()));
await page.screenshot({ path: path.join(outDir, `${label}-past-hero.png`) });
await page.screenshot({ path: path.join(outDir, `${label}-header.png`), clip: { x: 0, y: 0, width: 1440, height: 140 } });
await browser.close();
