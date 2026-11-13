import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';

const frontend = path.resolve(import.meta.dirname, '..');
const out = path.resolve(frontend, '../artifacts/wizard-units-v2');
const base = process.env.STUDENTLY_TEST_URL ?? 'http://localhost:8082';
await mkdir(out, { recursive: true });
const bundle = await build({ stdin: { contents: `export * from './features/listings/create/v2/model';export * from './features/listings/create/v2/examples';`, loader: 'ts', resolveDir: frontend }, bundle: true, write: false, format: 'esm', platform: 'node' });
const m = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const checks = [], errors = [], publishes = [], screenshots = [], videos = [];
const campus = { id: '10000000-0000-4000-8000-000000000001', name: 'AUB Beirut Campus', displayName: 'AUB Beirut', slug: 'aub', city: 'Beirut', lat: 33.899, lng: 35.482 };

async function contextFor(width = 1440, videoName, seed, key = m.storageKey(null), options = {}) {
  const height = width < 768 ? 900 : 1000;
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce',
    ...(videoName ? { recordVideo: { dir: path.join(out, 'recordings'), size: { width, height } } } : {}) });
  if (seed) await context.addInitScript(({ seed, key }) => {
    if (!sessionStorage.getItem('v2-seeded')) { localStorage.setItem(key, JSON.stringify(seed)); sessionStorage.setItem('v2-seeded', '1'); }
  }, { seed, key });
  await context.addInitScript(() => { localStorage.setItem('studently.createListing.draft.v4', '{"preserved":"v1"}'); });
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/listings/publish-units') { publishes.push(route.request().postDataJSON()); return route.abort(); }
    if (options.handler && await options.handler(route, url)) return;
    let data = [];
    if (url.pathname === '/api/universities') data = [campus];
    if (url.pathname === '/api/institutions') data = [{ id: 'aub', name: 'American University of Beirut', shortName: 'AUB', slug: 'aub', logoUrl: null, website: null, campuses: [campus] }];
    if (url.pathname === '/api/listings/drafts') data = { main: null, working: null };
    if (url.pathname === '/api/listings/publish-quote') {
      const count = Number(url.searchParams.get('count'));
      data = { units: Array.from({ length: count }, (_, index) => ({ index, credits: index ? 1 : 0 })), total: Math.max(0, count - 1), balance: options.balance ?? 20 };
    }
    if (url.pathname.startsWith('/api/listings/places/')) {
      const place = m.exampleWizard('existing', base).place;
      data = { ...place.data, id: url.pathname.split('/').at(-1), kind: place.kind, lng: 35.482, lat: 33.899, photos: [] };
    }
    if (url.pathname === '/api/listings/photos') data = { urls: [`${base}/wizard-v2-demo/room-1.jpg`] };
    await route.fulfill({ json: { data } });
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  return { page, context, async close() {
    const video = page.video();
    await context.close();
    if (videoName && video) { const target = path.join(out, `${videoName}.webm`); await rename(await video.path(), target); videos.push(path.basename(target)); }
  } };
}
async function screen(page, name) {
  await expect(page.getByTestId('wizard-v2')).toHaveAttribute('data-screen', name, { timeout: 120000 });
}
async function next(page, from, to, label = 'Next') {
  await screen(page, from);
  await page.getByRole('button', { name: label, exact: true }).click();
  await screen(page, to);
  await expect(page.locator('.v2-form-inner > h1')).toBeFocused();
}
async function capture(page, name) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal overflow`);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(out, file), fullPage: true });
  screenshots.push(file);
}
async function saved(page, key) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
}
async function review(page, count, name) {
  await page.getByRole('button', { name: 'Done — review units', exact: true }).click();
  await screen(page, 'review');
  await expect(page.getByTestId('v2-unit-row')).toHaveCount(count);
  await expect(page.getByRole('heading', { name: 'One contact for every unit.' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Publish all', exact: true })).toBeEnabled();
  await expect.poll(() => page.locator('.v2-unit-row img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBeTruthy();
  await capture(page, `${name}-review`);
  await page.getByRole('region', { name: 'Credit total' }).scrollIntoViewIfNeeded();
  await capture(page, `${name}-contact-cost`);
  await page.getByRole('button', { name: 'Publish all', exact: true }).click();
  await screen(page, 'success');
  await capture(page, `${name}-success`);
  assert.equal(await page.evaluate(() => localStorage.getItem('studently.createListing.draft.v4')), '{"preserved":"v1"}');
}

try {
  for (const width of [1440, 375]) {
    const device = width === 375 ? 'mobile' : 'desktop';
    {
      const c = await contextFor(width, `one-unit-${device}`), p = c.page;
      try {
        await p.goto(`${base}/create?wizard=v2&demo=one`, { timeout: 180000 });
        await screen(p, 'place-type'); await capture(p, `one-unit-${device}-place`);
        await next(p, 'place-type', 'location');
        await next(p, 'location', 'utilities');
        await next(p, 'utilities', 'rules');
        await next(p, 'rules', 'building-photos');
        await next(p, 'building-photos', 'layout', 'Skip for now');
        await capture(p, `one-unit-${device}-layout`);
        await next(p, 'layout', 'photos'); await next(p, 'photos', 'rent');
        await next(p, 'rent', 'copy'); await next(p, 'copy', 'another', 'Finish unit');
        await expect(p.getByRole('region', { name: 'Units added so far' }).or(p.locator('[aria-label="Units added so far"]'))).toBeVisible();
        await capture(p, `one-unit-${device}-another`);
        await p.reload(); await screen(p, 'another');
        assert.equal((await saved(p, m.storageKey(null, undefined, 'one'))).units[0].data.photos.length, 3);
        await review(p, 1, `one-unit-${device}`);
        await p.reload(); await screen(p, 'success');
        checks.push(`${device}: complete one-unit flow, optional building photos, same-browser reload, shared contact, simulated publish`);
      } finally { await c.close(); }
    }
    {
      const c = await contextFor(width, `three-units-copy-${device}`), p = c.page;
      try {
        await p.goto(`${base}/create?wizard=v2&demo=three`); await screen(p, 'another');
        await capture(p, `three-units-${device}-first-summary`);
        for (let i = 2; i <= 3; i++) {
          await p.getByRole('button', { name: 'Copy this unit', exact: false }).click(); await screen(p, 'layout');
          const key = m.storageKey(null, undefined, 'three');
          const copied = (await saved(p, key)).units[i - 1];
          assert.ok(copied.data.title.endsWith(' (copy)')); assert.equal(copied.data.photos.length, 0);
          await next(p, 'layout', 'photos');
          await expect(p.locator('[data-photo-tile]')).toHaveCount(0);
          await p.getByRole('button', { name: 'Use 3 example photos', exact: true }).click();
          await next(p, 'photos', 'rent'); await p.getByLabel('Monthly rent in USD').fill(i === 2 ? '750' : '850');
          await next(p, 'rent', 'copy');
          await expect(p.getByLabel('Listing title')).toHaveValue(/\(copy\)$/);
          if (i === 2) await capture(p, `three-units-${device}-copy-title`);
          if (i === 3) await p.getByLabel('Listing title').fill('Third-floor apartment near campus');
          await next(p, 'copy', 'another', 'Finish unit');
          await expect(p.getByTestId('v2-unit-row')).toHaveCount(i);
        }
        await capture(p, `three-units-${device}-summary`);
        await p.reload(); await screen(p, 'another');
        assert.deepEqual((await saved(p, m.storageKey(null, undefined, 'three'))).units.map(u => u.data.monthlyRentUsd), ['650', '750', '850']);
        await review(p, 3, `three-units-${device}`);
        checks.push(`${device}: three units via copy, visible suffix, photos cleared, independent rents, growing thumbnail summaries, reload, total 2 example credits`);
      } finally { await c.close(); }
    }
    {
      const c = await contextFor(width, `existing-place-${device}`), p = c.page;
      try {
        await p.goto(`${base}/create?wizard=v2&demo=existing`); await screen(p, 'layout');
        await expect(p.getByRole('button', { name: /Place.*existing/ })).toBeDisabled();
        await capture(p, `existing-place-${device}-layout`);
        await next(p, 'layout', 'photos'); await p.getByRole('button', { name: 'Use 3 example photos' }).click();
        await next(p, 'photos', 'rent'); await p.getByLabel('Monthly rent in USD').fill('700');
        await next(p, 'rent', 'copy'); await next(p, 'copy', 'another', 'Finish unit');
        await review(p, 1, `existing-place-${device}`);
        checks.push(`${device}: existing place skips all Place screens and keeps inherited details read-only`);
      } finally { await c.close(); }
    }
  }

  // Review edits, removal, Start blank, quote refresh and empty-review behavior.
  {
    let seed = m.exampleWizard('three', base);
    for (let i = 2; i <= 3; i++) {
      seed = m.reduceWizard(seed, { type: 'add', id: `u${i}`, copyFrom: seed.position.unitId });
      seed = m.reduceWizard(seed, { type: 'gallery', id: `u${i}`, update: m.examplePhotos(base, `u${i}`) });
      for (let j = 0; j < 4; j++) seed = m.reduceWizard(seed, { type: 'next' });
    }
    seed = m.reduceWizard(seed, { type: 'review' });
    let quoteCount = 0, failQuote = true;
    const c = await contextFor(1440, undefined, seed, m.storageKey(null), { handler: async (route, url) => {
      if (url.pathname === '/api/listings/publish-quote') { quoteCount++; if (failQuote) { await route.fulfill({ status: 503, json: { error: { message: 'Test quote failure' } } }); return true; } }
    } }), p = c.page;
    try {
      await p.goto(`${base}/create?wizard=v2`); await screen(p, 'review');
      await expect(p.getByRole('button', { name: 'Publish all', exact: true })).toBeDisabled();
      await expect(p.getByRole('button', { name: 'Retry credit total' })).toBeVisible();
      failQuote = false; await p.getByRole('button', { name: 'Retry credit total' }).click();
      await expect(p.getByRole('button', { name: 'Publish all', exact: true })).toBeEnabled();
      await p.getByRole('button', { name: 'Edit unit 2', exact: true }).click(); await screen(p, 'layout');
      await next(p, 'layout', 'photos'); await next(p, 'photos', 'rent');
      await p.getByLabel('Monthly rent in USD').fill('775'); await next(p, 'rent', 'copy');
      await next(p, 'copy', 'review', 'Save unit');
      await expect(p.getByTestId('v2-unit-row').nth(1)).toContainText('$775');
      await p.getByRole('button', { name: 'Remove unit 2', exact: true }).click();
      await p.getByRole('alertdialog').getByRole('button', { name: 'Keep unit' }).click();
      await expect(p.getByTestId('v2-unit-row')).toHaveCount(3);
      await p.getByRole('button', { name: 'Remove unit 2', exact: true }).click();
      await p.getByRole('alertdialog').getByRole('button', { name: 'Remove unit', exact: true }).click();
      await expect(p.getByTestId('v2-unit-row')).toHaveCount(2);
      await expect(p.getByRole('region', { name: 'Credit total' })).toContainText('1 credit');
      await p.getByRole('button', { name: '+ Add another unit', exact: true }).click(); await screen(p, 'layout');
      await p.getByRole('button', { name: 'Next', exact: true }).click();
      await screen(p, 'layout'); await expect(p.getByRole('alert')).toContainText('Choose a rental type');
      await p.getByRole('button', { name: /Review/ }).click(); await screen(p, 'review');
      await p.getByRole('button', { name: 'Publish all', exact: true }).click();
      await expect(p.getByRole('alert')).toBeVisible(); await screen(p, 'review');
      while (await p.getByTestId('v2-unit-row').count()) {
        await p.getByRole('button', { name: 'Remove unit 1', exact: true }).click();
        await p.getByRole('alertdialog').getByRole('button', { name: 'Remove unit', exact: true }).click();
      }
      await expect(p.getByText('No units yet. Add a unit to continue.')).toBeVisible();
      await expect(p.getByRole('button', { name: 'Publish all', exact: true })).toBeDisabled();
      assert.ok(quoteCount >= 3);
      checks.push('Review: quote failure/retry, edit-return, removal confirmation/cancel, quote refresh, blank-unit validation, empty batch blocked');
    } finally { await c.close(); }
  }

  // Actual existing-place fetch and a real file/crop pipeline, with only the upload response mocked.
  {
    let lookups = 0, uploadRoute, releaseUpload;
    const uploaded = new Promise(resolve => { releaseUpload = resolve; });
    let seed = m.exampleWizard('three', base);
    seed = m.reduceWizard(seed, { type: 'add', id: 'upload-target', copyFrom: seed.position.unitId });
    seed.position.screen = 'photos';
    const c = await contextFor(1440, undefined, seed, m.storageKey(null), { handler: async (route, url) => {
      if (url.pathname.startsWith('/api/listings/places/')) lookups++;
      if (url.pathname === '/api/listings/photos') { uploadRoute = route; await uploaded; await route.fulfill({ json: { data: { urls: [`${base}/wizard-v2-demo/room-2.jpg`] } } }); return true; }
    } }), p = c.page;
    try {
      await p.goto(`${base}/create?wizard=v2`); await screen(p, 'photos');
      const bytes = await readFile(path.join(frontend, 'public/wizard-v2-demo/room-1.jpg'));
      const transfer = await p.evaluateHandle(encoded => {
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const d = new DataTransfer(); d.items.add(new File([bytes], 'unit-photo.jpg', { type: 'image/jpeg' })); return d;
      }, bytes.toString('base64'));
      await p.locator('[data-photo-drop]').dispatchEvent('drop', { dataTransfer: transfer }); await transfer.dispose();
      await expect(p.getByRole('dialog', { name: 'Crop photos' })).toBeVisible();
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(() => Boolean(uploadRoute)).toBeTruthy();
      await p.getByRole('button', { name: /Unit 1$/ }).click(); await screen(p, 'layout');
      releaseUpload();
      await expect.poll(async () => (await saved(p, m.storageKey(null))).units[1].data.photos[0]?.status).toBe('ready');
      assert.equal((await saved(p, m.storageKey(null))).units[0].data.photos.length, 3);
      await p.reload(); await screen(p, 'layout');
      assert.equal((await saved(p, m.storageKey(null))).units[1].data.photos[0].url, `${base}/wizard-v2-demo/room-2.jpg`);
      // A distinct place scope must issue the existing ownership-checked read.
      await p.goto(`${base}/create?wizard=v2&placeId=10000000-0000-4000-8000-000000000002`);
      await screen(p, 'layout'); assert.equal(lookups, 1);
      await expect(p.getByText('Cedar House', { exact: true })).toHaveCount(2);
      checks.push('Real photo intake/crop: delayed upload stays with Unit 2 after switching to Unit 1; URL survives reload; existing-place endpoint loaded once');
    } finally { releaseUpload(); await c.close(); }
  }

  {
    const c = await contextFor(375), p = c.page;
    try {
      await p.addInitScript(() => {
        window.blockV2Storage = true;
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (window.blockV2Storage && key.startsWith('studently.wizard-units-v2.')) throw new DOMException('Test quota', 'QuotaExceededError');
          return write.call(this, key, value);
        };
      });
      await p.goto(`${base}/create?wizard=v2&demo=three`); await screen(p, 'another');
      await expect(p.getByRole('button', { name: 'Retry saving' })).toBeVisible();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await p.getByRole('button', { name: 'Save & exit', exact: true }).click();
      await screen(p, 'another');
      await p.evaluate(() => { window.blockV2Storage = false; });
      await p.getByRole('button', { name: 'Retry saving' }).click();
      await expect(p.getByRole('status')).toContainText('Saved on this browser');
      checks.push('Storage failure is visible, Save & exit preserves work, Retry saving recovers');
    } finally { await c.close(); }
  }
  for (const width of [768, 1024]) {
    const c = await contextFor(width), p = c.page;
    try {
      await p.goto(`${base}/create?wizard=v2&demo=three`); await screen(p, 'another');
      await capture(p, `tablet-${width}-summary`);
      await p.keyboard.press('Tab');
      assert.equal(await p.evaluate(() => document.activeElement?.tagName), 'BUTTON');
      assert.equal(await p.locator('.v2-form-inner').evaluate(el => getComputedStyle(el).animationName), 'none');
    } finally { await c.close(); }
  }
  checks.push('768/1024 layouts: no horizontal overflow, keyboard focus works, reduced-motion entry animation disabled');

  // V1 must remain the default route. Do not seed any v1 draft for this check.
  {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await context.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.route('**/api/listings/drafts', r => r.fulfill({ json: { data: { main: null, working: null } } }));
    await p.goto(`${base}/create`);
    await expect(p.getByText('What are you listing?', { exact: true })).toBeVisible({ timeout: 90000 });
    await expect(p.getByTestId('wizard-v2')).toHaveCount(0);
    await context.close();
    checks.push('Default /create uses the original wizard');
  }
  assert.deepEqual(publishes, [], 'No real publish requests');
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  await writeFile(path.join(out, 'acceptance-results.json'), JSON.stringify({ base, checks, screenshots, videos, realPublishRequests: publishes.length, uncaughtBrowserErrors: errors }, null, 2));
  console.log(JSON.stringify({ checks, screenshots: screenshots.length, videos: videos.length, realPublishRequests: publishes.length, uncaughtBrowserErrors: errors.length }, null, 2));
} catch (error) {
  await writeFile(path.join(out, 'failure.json'), JSON.stringify({ error: String(error), checks, errors, publishes }, null, 2));
  throw error;
} finally { await browser.close(); }
