// Desktop homepage: factor 1.0 at viewport W vs factor 1.1 laid out at W/0.9,
// then raster-scaled by 0.9. That is Chrome's 90% zoom on a W-wide window
// (layout viewport grows, painted pixels shrink).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '../..');
const scratch = path.join(root, 'frontend/.expo/homepage-scale-v2');
const output = path.join(root, 'artifacts/homepage-scale/v2');
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });

const widths = [1280, 1440, 1920];
const baseUrl = process.env.STUDENTLY_TEST_URL ?? 'http://127.0.0.1:8081';

function launch() {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
  return chromium.launch({ headless: true, channel }).catch(() => chromium.launch({ headless: true }));
}

async function prepare(page) {
  await page.goto(baseUrl, { timeout: 120000, waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Student foyers in Lebanon', { exact: true })).toBeVisible({ timeout: 90000 });
  await page.evaluate(() => {
    const last = window.setInterval(() => {}, 1e9);
    for (let id = 1; id <= last; id += 1) window.clearInterval(id);
    document.getAnimations?.().forEach(animation => animation.pause());
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const scrollHeight = await page.evaluate(() => {
    const title = [...document.querySelectorAll('div')].find(el => el.textContent === 'Student foyers in Lebanon' && el.childElementCount === 0);
    const scroll = [...document.querySelectorAll('div')].filter(el => /auto|scroll/.test(getComputedStyle(el).overflowY) && title && el.contains(title)).sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    return scroll?.scrollHeight ?? document.documentElement.scrollHeight;
  });
  return scrollHeight;
}

function readMetrics() {
  return pageMetrics();
}

function pageMetrics() {
  const exact = (text) => [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === text);
  const box = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      font: Number.parseFloat(s.fontSize) || null,
      line: Number.parseFloat(s.lineHeight) || null,
      radius: Number.parseFloat(s.borderTopLeftRadius) || 0,
      pad: Number.parseFloat(s.paddingLeft) || 0,
      shadow: s.boxShadow,
      clamp: s.webkitLineClamp || '',
    };
  };
  const walkBar = (start) => {
    let node = start;
    while (node && node.parentElement) {
      const radius = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius);
      if (radius > 20 && node.getBoundingClientRect().height > 40) return node;
      node = node.parentElement;
    }
    return start;
  };
  const heroTitle = exact('Student foyers in Lebanon');
  let hero = heroTitle;
  while (hero && hero.parentElement && hero.getBoundingClientRect().height < 200) hero = hero.parentElement;
  const card = document.querySelector('[data-testid^="home-listing-"]');
  const cardTitle = card && [...card.querySelectorAll('div')].find(el => {
    const clamp = getComputedStyle(el).webkitLineClamp;
    return clamp && clamp !== 'none';
  });
  const media = card?.querySelector('[data-testid="listing-grid-media"]');
  const heart = document.querySelector('button[aria-label="Save listing"], button[aria-label="Remove from saved"]');
  const input = document.querySelector('input');
  const logo = document.querySelector('img[alt="Studently Logo"]');
  const tile = document.querySelector('.sk-city-card')
    || [...document.querySelectorAll('[role="link"]')].find(el => {
      const r = el.getBoundingClientRect();
      return r.width > 80 && Math.abs(r.width - r.height) < 3;
    });
  const tileLabel = tile && [...tile.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim());
  const home = document.querySelector('[data-testid="homepage"]');
  const section = exact('Popular across Lebanon');
  let sectionWrap = section;
  while (sectionWrap && sectionWrap.parentElement && sectionWrap.parentElement.getBoundingClientRect().width > sectionWrap.getBoundingClientRect().width + 1) {
    if (sectionWrap.parentElement.getBoundingClientRect().width > window.innerWidth - 1) break;
    sectionWrap = sectionWrap.parentElement;
  }
  const step = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === '1' && el.getBoundingClientRect().width < 80);
  let stepCircle = step?.parentElement ?? null;
  const quote = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.includes('Trusted') === false && el.textContent.startsWith('“'));
  const value = exact('WhatsApp in one tap');
  const help = exact('Fastest reply');
  const stat = exact('Live listings');
  const chip = exact('Solar, ishtirak & water');
  const banner = exact('Browse near campus');
  const footer = [...document.querySelectorAll('img[alt="Studently Logo"]')].at(-1);
  return {
    scaleAttr: home?.getAttribute('data-desktop-scale') ?? '',
    cssVar: home ? getComputedStyle(home).getPropertyValue('--sk-desktop-scale').trim() : '',
    innerWidth: window.innerWidth,
    hero: box(hero),
    heroTitle: box(heroTitle),
    section: box(section),
    sectionWrap: box(sectionWrap),
    chip: box(chip),
    search: box(walkBar(input)),
    searchFont: input ? Number.parseFloat(getComputedStyle(input).fontSize) : null,
    searchShadow: input ? getComputedStyle(walkBar(input)).boxShadow : '',
    logo: box(logo),
    brand: box(exact('Studently')),
    stat: box(stat),
    tile: box(tile),
    tileLabel: box(tileLabel),
    tileRadius: tile ? Number.parseFloat(getComputedStyle(tile).borderTopLeftRadius) : null,
    card: box(card),
    cardTitle: box(cardTitle),
    media: box(media),
    heart: box(heart?.parentElement ?? heart),
    heartStroke: heart?.querySelector('path')?.getAttribute('stroke-width') ?? '',
    quote: box(quote),
    valueIcon: box(value?.previousElementSibling ?? null),
    stepCircle: box(stepCircle),
    banner: box(banner),
    help: box(help),
    footerLogo: box(footer),
    toggle: box(document.querySelector('[data-testid="desktop-scale-toggle"]')),
    cardCount: document.querySelectorAll('[data-testid^="home-listing-"]').length,
  };
}

const browser = await launch();
const report = { mobile: null, liveToggle: null, widths: {}, errors: [] };
try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await mobile.addInitScript(() => localStorage.setItem('studently.homepageScale', '1.1'));
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', error => report.errors.push(`mobile ${error.message}`));
  await prepare(mobilePage);
  report.mobile = await mobilePage.evaluate(pageMetrics);
  await mobile.close();

  const live = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await live.addInitScript(() => localStorage.setItem('studently.homepageScale', '1.1'));
  const livePage = await live.newPage();
  livePage.on('pageerror', error => report.errors.push(`toggle ${error.message}`));
  await prepare(livePage);
  const beforeHref = livePage.url();
  const beforeFont = await livePage.evaluate(() => {
    const title = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === 'Student foyers in Lebanon');
    return Number.parseFloat(getComputedStyle(title).fontSize);
  });
  await livePage.getByRole('button', { name: 'Scale 1.0', exact: true }).click();
  await livePage.waitForFunction(() => document.querySelector('[data-testid="homepage"]')?.getAttribute('data-desktop-scale') === '1');
  const midFont = await livePage.evaluate(() => {
    const title = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === 'Student foyers in Lebanon');
    return Number.parseFloat(getComputedStyle(title).fontSize);
  });
  await livePage.getByRole('button', { name: 'Scale 1.1', exact: true }).click();
  await livePage.waitForFunction(() => document.querySelector('[data-testid="homepage"]')?.getAttribute('data-desktop-scale') === '1.1');
  const afterFont = await livePage.evaluate(() => {
    const title = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === 'Student foyers in Lebanon');
    return {
      font: Number.parseFloat(getComputedStyle(title).fontSize),
      stored: localStorage.getItem('studently.homepageScale'),
    };
  });
  report.liveToggle = {
    hrefUnchanged: livePage.url() === beforeHref,
    beforeFont, midFont, afterFont: afterFont.font, stored: afterFont.stored,
  };
  await live.close();

  for (const width of widths) {
    const pair = {};
    for (const factor of ['1', '1.1']) {
      const layoutWidth = factor === '1' ? width : Math.round(width / 0.9);
      const context = await browser.newContext({
        viewport: { width: layoutWidth, height: 1000 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      });
      await context.addInitScript(value => localStorage.setItem('studently.homepageScale', value), factor);
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(`${width} ${factor} ${error.message}`));
      await prepare(page);
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(img => img.complete ? null : img.decode().catch(() => {})));
      });
      let height = 1000;
      for (let pass = 0; pass < 8; pass += 1) {
        const next = await page.evaluate(() => {
          const title = [...document.querySelectorAll('div')].find(el => el.childElementCount === 0 && el.textContent.trim() === 'Student foyers in Lebanon');
          const scrolls = [...document.querySelectorAll('div')].filter(el => /auto|scroll/.test(getComputedStyle(el).overflowY) && title && el.contains(title));
          const scrollH = scrolls.reduce((max, el) => Math.max(max, el.scrollHeight), 0);
          const bottom = [...document.body.querySelectorAll('*')].reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0);
          return Math.ceil(Math.max(scrollH, bottom) + 32);
        });
        if (Math.abs(next - height) <= 8) break;
        height = Math.min(next, 16000);
        await page.setViewportSize({ width: layoutWidth, height });
        await page.waitForTimeout(300);
      }
      const metrics = await page.evaluate(pageMetrics);
      const file = path.join(scratch, `${width}-${factor}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
      pair[factor] = { layoutWidth, height, metrics, file };
      await context.close();
    }
    report.widths[width] = {
      scale1: pair['1'].metrics,
      scale11: pair['1.1'].metrics,
      files: { one: pair['1'].file, eleven: pair['1.1'].file },
    };
  }
} finally {
  await browser.close();
}

await writeFile(path.join(scratch, 'metrics.json'), JSON.stringify(report, null, 2));
const py = spawn('python', [path.join(import.meta.dirname, 'homepage-scale-v2-diff.py'), scratch, output], { stdio: 'inherit' });
const code = await new Promise(resolve => py.on('close', resolve));
if (code !== 0) process.exit(code);
console.log(JSON.stringify({
  mobileScale: report.mobile?.scaleAttr,
  mobileHero: report.mobile?.heroTitle?.font,
  mobileClamp: report.mobile?.cardTitle?.clamp,
  mobileToggle: report.mobile?.toggle,
  liveToggle: report.liveToggle,
  errors: report.errors,
}, null, 2));
