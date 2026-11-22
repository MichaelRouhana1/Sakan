import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const base = process.env.MAP_DETAIL_URL ?? 'http://127.0.0.1:8091';
const output = path.resolve(import.meta.dirname, '../../artifacts/university-map-compact');
await mkdir(output, { recursive: true });
const universities = [
  { id: 'usj', slug: 'usj-science', institutionSlug: 'usj', name: 'USJ — Science and Technology Campus', mapLabel: 'USJ — Science and Technology Campus', institutionShortName: 'USJ', lat: 33.878, lng: 35.537 },
  { id: 'aul', slug: 'aul-dekwaneh', institutionSlug: 'aul', name: 'AUL — Dekwaneh Campus', mapLabel: 'AUL · Dekwaneh', institutionShortName: 'AUL', lat: 33.888, lng: 35.546 },
  { id: 'aul-north', slug: 'aul-north', institutionSlug: 'aul', name: 'AUL — North Campus', mapLabel: 'AUL · North', institutionShortName: 'AUL', lat: 34.41, lng: 35.83 },
  { id: 'unmapped', slug: 'unmapped', name: 'Unmapped University', lat: null, lng: null },
];
const listing = (id) => ({
  id, placeId: id, posterId: 'owner', title: 'Sunny apartment in Dekwaneh', listingType: 'entire_apartment',
  unitType: 'whole_apartment', placeKind: 'apartment', priceBasis: 'per_unit_month',
  status: 'active', availability: 'available', monthlyRentUsd: 450, securityDepositUsd: 450,
  area: 'Dekwaneh', landmark: 'Main street', lat: id === 'second' ? 33.877 : 33.884, lng: id === 'second' ? 35.537 : 35.546,
  nearestCampusSlug: 'usj-science', nearestCampusName: 'USJ — Science and Technology Campus', distanceMeters: 1,
  genderRestriction: 'anyone', furnishingType: 'furnished', floorNumber: 2, bedrooms: 2, bathrooms: 1,
  areaSqm: 80, leaseTerm: 'semester', description: 'A sunlit apartment with space to study.',
  electricity: 'solar', water: 'state_well_24_7', wifiIncluded: true, amenities: ['balcony'],
  photos: [{ id: 'cover', url: base + '/fixture/unit-bedroom.png', sortOrder: 0 }],
  contactName: 'Host', listingPosterRole: 'landlord', createdAt: '2026-10-01', publishedAt: '2026-10-01', expiresAt: '2099-01-01',
});
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const checks = [], errors = [];
try {
  for (const width of [1440, 768, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/fixture/*.png', async route => route.fulfill({ contentType: 'image/png', body: await readFile(path.resolve(import.meta.dirname, '../../backend/src/db/seeds/assets/unit-bedroom.png')) }));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/universities') {
        await new Promise(resolve => setTimeout(resolve, 600));
        return route.fulfill({ json: { data: universities } });
      }
      const match = url.pathname.match(/^\/api\/listings\/([^/]+)$/);
      return route.fulfill({ json: { data: match ? listing(match[1]) : [] } });
    });
    await page.goto(base + '/listing/first', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const section = page.getByTestId('listing-map-section');
    await expect(section).toBeVisible({ timeout: 120000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText('AUL — Dekwaneh Campus');
    await expect(section).toContainText('445 m away · Closest university');
    const universityPin = section.getByTestId('detail-university-pin');
    await expect(universityPin).toHaveAttribute('data-campus-slug', 'aul-dekwaneh', { timeout: 60000 });
    await expect(universityPin).toHaveCount(1);
    await expect(section.getByTestId('detail-listing-pin')).toHaveCount(1);
    await expect(universityPin).toBeInViewport();
    await expect(section.getByTestId('detail-listing-pin')).toBeInViewport();
    const filter = section.getByRole('button', { name: 'Choose university on map', exact: true });
    const mapBox = await section.locator('.studently-mapbox-map').boundingBox();
    const filterBox = await filter.boundingBox();
    const zoomBox = await section.locator('.mapboxgl-ctrl-zoom-in').boundingBox();
    assert.ok(filterBox.x >= mapBox.x && filterBox.y >= mapBox.y);
    assert.ok(filterBox.x + filterBox.width <= zoomBox.x - 3, 'filter sits to the left of zoom');
    assert.ok(Math.abs(filterBox.y - zoomBox.y) < 5, 'filter aligns with the zoom controls');
    await page.waitForFunction(() => {
      const host = document.querySelector('[data-testid="listing-map-section"] .studently-mapbox-map');
      const key = host && Object.keys(host).find(key => key.startsWith('__reactFiber$'));
      let fiber = key ? host[key] : null;
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          const value = hook.memoizedState?.current;
          if (value && typeof value.areTilesLoaded === 'function') return value.loaded() && value.areTilesLoaded();
          hook = hook.next;
        }
        fiber = fiber.return;
      }
      return false;
    }, null, { timeout: 60000 });
    await section.screenshot({ path: path.join(output, `default-${width}.png`) });
    await section.getByRole('button', { name: 'Choose university on map', exact: true }).click();
    await expect(page.getByRole('menuitem')).toHaveCount(3);
    const labels = await page.getByRole('menuitem').allTextContents();
    assert.ok(labels[0].includes('Dekwaneh'));
    await page.getByRole('textbox', { name: 'Search universities or campuses' }).fill('Science');
    await expect(page.getByRole('menuitem')).toHaveCount(1);
    await page.screenshot({ path: path.join(output, `selector-${width}.png`) });
    await page.getByRole('menuitem').click();
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    await expect(universityPin).toHaveAttribute('data-campus-slug', 'usj-science');
    await expect(universityPin).toHaveCount(1);
    await expect(section).not.toContainText('Closest university');
    await expect(universityPin).toBeInViewport();
    await expect(section.getByTestId('detail-listing-pin')).toBeInViewport();
    const label = universityPin.locator('.studently-campus-label');
    const labelFit = await label.evaluate(el => {
      const text = document.createRange(); text.selectNodeContents(el);
      const content = text.getBoundingClientRect(), box = el.getBoundingClientRect();
      const map = el.closest('.studently-mapbox-map').getBoundingClientRect();
      return { inside: content.left >= box.left && content.right <= box.right && content.top >= box.top && content.bottom <= box.bottom,
        inMap: box.left >= map.left && box.right <= map.right && box.top >= map.top && box.bottom <= map.bottom,
        height: box.height };
    });
    assert.ok(labelFit.inside, 'long university name stays inside its label background');
    assert.ok(labelFit.inMap, `whole label stays inside the map: ${JSON.stringify(labelFit)}`);
    assert.ok(labelFit.height > 25, 'long name wraps onto multiple lines');
    const labelBox = await label.boundingBox(), listingPinBox = await section.getByTestId('detail-listing-pin').boundingBox();
    assert.ok(labelBox.x + labelBox.width <= listingPinBox.x || labelBox.x >= listingPinBox.x + listingPinBox.width ||
      labelBox.y + labelBox.height <= listingPinBox.y || labelBox.y >= listingPinBox.y + listingPinBox.height,
      'university label does not cover the listing pin');
    await section.screenshot({ path: path.join(output, `selected-${width}.png`) });
    await section.getByRole('button', { name: 'Choose university on map', exact: true }).click();
    await expect(page.getByRole('menuitem')).toHaveCount(3);
    await expect(page.getByRole('textbox', { name: 'Search universities or campuses' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    checks.push(`${width}px: nearest default after async loading; only selected university pin; search, select, fit, dismiss; no overflow`);
    await page.goto(base + '/listing/second');
    await expect(section).toContainText('111 m away · Closest university');
    await expect(universityPin).toHaveAttribute('data-campus-slug', 'usj-science');
    checks.push(`${width}px: new listing selects its own nearest campus`);
    await context.close();
  }
  for (const mode of ['empty', 'single', 'error']) {
    const context = await browser.newContext({ viewport: { width: 375, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    let recovered = false;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/universities') {
        if (mode === 'error' && !recovered) return route.fulfill({ status: 500, json: { error: { message: 'Unavailable' } } });
        return route.fulfill({ json: { data: mode === 'empty' ? [] : mode === 'single' ? [universities[1]] : universities } });
      }
      const match = url.pathname.match(/^\/api\/listings\/([^/]+)$/);
      return route.fulfill({ json: { data: match ? { ...listing(match[1]), photos: [] } : [] } });
    });
    await page.goto(base + '/listing/first');
    const section = page.getByTestId('listing-map-section');
    await expect(section).toBeVisible({ timeout: 30000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByTestId('detail-listing-pin')).toHaveCount(1, { timeout: 30000 });
    if (mode === 'empty') {
      await expect(section).toContainText('No university locations available yet.');
      await expect(section.getByTestId('detail-university-pin')).toHaveCount(0);
    } else if (mode === 'single') {
      await expect(section.getByTestId('detail-university-pin')).toHaveAttribute('data-campus-slug', 'aul-dekwaneh');
      await section.getByRole('button', { name: 'Choose university on map', exact: true }).click();
      await expect(page.getByRole('menuitem')).toHaveCount(1);
      await page.getByRole('menuitem').click();
      await expect(page.getByRole('menuitem')).toHaveCount(0);
    } else {
      const retry = section.getByRole('button', { name: 'Retry universities' });
      await expect(retry).toBeVisible({ timeout: 45000 });
      recovered = true;
      await retry.click();
      await expect(section.getByTestId('detail-university-pin')).toHaveAttribute('data-campus-slug', 'aul-dekwaneh');
    }
    checks.push(`${mode}: listing map remains usable${mode === 'error' ? ' and retry recovers' : ''}`);
    await context.close();
  }
  const unexpected = errors.filter(message => !/Hydration|hydration|Minified React error #418/.test(message));
  assert.deepEqual(unexpected, []);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
