// Real exported Expo detail routes. Only API responses and local fixture media
// are controlled; the desktop/mobile shells, hooks and navigation are real.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const frontend = path.resolve(import.meta.dirname, '..');
const root = path.join(frontend, '.expo/detail-export');
const output = path.join(frontend, '.expo/detail-ui');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (/^\/listing\/[^/]+$/.test(pathname)) target = path.join(root, 'listing/[id].html');
  else if (!path.extname(target)) target += pathname.endsWith('/') ? 'index.html' : '.html';
  try { res.setHeader('content-type', mime[path.extname(target)] ?? 'application/octet-stream'); res.end(await readFile(target)); }
  catch { res.writeHead(404); res.end(); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const defaults = { electricity: 'solar', water: 'state_well_24_7', wifiIncluded: true, routerUps: true, hasElevator: true, elevator24_7: true, hasSolar: true, generatorAmperes: 10, generatorIncluded: true, waterBillIncluded: true, buildingFeesIncluded: true, parkingIncludedInRent: false, cookingGasIncluded: false, conciergeIncluded: false, electricityCutWindows: [], electricityCutsStart: null, electricityCutsEnd: null, electricityHoursOn: null, smokingPolicy: 'no', petsPolicy: 'cats_only', guestsPolicy: 'restricted', quietHours: true, targetAudience: 'anyone', amenities: ['balcony', 'parking'] };
const unit = (id, unitType = 'private_room', placeKind = 'apartment', multi = true) => ({
  ...defaults, id, unitType, placeKind, placeId: multi ? 'place-' + placeKind : 'single-place', posterId: 'owner',
  title: unitType === 'whole_apartment' ? 'Bright apartment on Bliss' : unitType === 'shared_bed' ? 'Bed in a sunny shared room' : 'Sunny private room on Bliss',
  listingType: unitType === 'whole_apartment' ? 'entire_apartment' : unitType === 'shared_bed' ? 'shared_dorm_bed' : 'private_room',
  priceBasis: unitType === 'shared_bed' ? 'per_bed_month' : unitType === 'private_room' ? 'per_room_month' : 'per_unit_month',
  status: 'active', availability: 'available', monthlyRentUsd: 350, securityDepositUsd: 350,
  area: 'Hamra', landmark: 'Bliss Street', buildingName: 'Bliss House', lat: null, lng: null,
  genderRestriction: 'anyone', furnishingType: 'furnished', floorNumber: 2, beds: 1, bedrooms: 1, bathrooms: 1, bathroomPrivacy: 'shared', bedsTotal: unitType === 'shared_bed' ? 4 : null, bedsAvailable: unitType === 'shared_bed' ? 2 : null,
  areaSqm: 22, leaseTerm: 'semester', paymentModality: 'monthly', availableFrom: '2026-11-01',
  description: 'A sunlit space with a study desk and room to settle in. The kitchen and balcony are shared with the other residents.',
  electricity: multi ? 'generator_24_7' : 'solar', generatorAmperes: multi ? null : 10, wifiIncluded: multi ? false : true, amenities: ['balcony', 'study_desk'],
  photos: ['unit-bedroom', 'unit-living', 'unit-detail'].map((name, i) => ({ id: `${id}-${i}`, url: base + '/fixture/' + name + '.png', caption: 'Unit photo ' + (i + 1), sortOrder: i })),
  sharedPhotos: multi ? ['shared-kitchen', 'shared-facade'].map((name, i) => ({ id: 'shared-' + i, url: base + '/fixture/' + name + '.png', caption: 'Shared photo ' + (i + 1), sortOrder: i })) : [],
  contactName: 'Fixture host', listingPosterRole: 'landlord', viewCount: 0, createdAt: '2026-10-01', publishedAt: '2026-10-01', expiresAt: '2099-01-01',
  placeContext: { isMultiUnit: multi, defaults, sources: { ...Object.fromEntries(Object.keys(defaults).filter(k => k !== 'amenities').map(k => [k, 'place'])), ...(multi ? { electricity: 'unit', generatorAmperes: 'unit', wifiIncluded: 'unit' } : {}) }, amenitySources: { balcony: 'place', parking: 'unit', study_desk: 'unit' }, unitAmenities: ['study_desk'], amenityOverrides: { parking: false } },
});
const fixtures = {
  single: unit('single', 'whole_apartment', 'apartment', false),
  rooms: unit('rooms'), building: unit('building', 'whole_apartment', 'building'), beds: unit('beds', 'shared_bed'),
};
const siblings = Object.fromEntries(Object.entries(fixtures).map(([key, value]) => [key, key === 'single' ? [] : [
  { ...value, id: key + '-a', title: 'Courtyard option', monthlyRentUsd: 280, electricity: 'solar', placeContext: { ...value.placeContext, sources: { ...value.placeContext.sources, electricity: 'place' } } },
  { ...value, id: key + '-b', title: 'Balcony option', monthlyRentUsd: 420, availability: 'pending' },
]]));
let failSiblings = false;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const checks = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/fixture/*.png', async route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    await route.fulfill({ contentType: 'image/png', body: await readFile(path.join(frontend, '../backend/src/db/seeds/assets', name)) });
  });
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const match = pathname.match(/^\/api\/listings\/([^/]+)(\/nearby)?$/);
    if (!match) return route.fulfill({ json: { data: [] } });
    const id = match[1], key = id.replace(/-[ab]$/, '');
    if (match[2]) return route.fulfill(failSiblings ? { status: 500, json: { error: { message: 'Fixture failure' } } } : { json: { data: (siblings[key] ?? []).filter(row => row.id !== id) } });
    return route.fulfill({ json: { data: fixtures[id] ?? siblings[key]?.find(row => row.id === id) } });
  });
  for (const width of [1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 844 : 1000 });
    for (const key of ['single', 'rooms', 'building', 'beds']) {
      await page.goto(base + '/listing/' + key);
      await expect(page.getByTestId('detail-hero-image').first()).toBeVisible({ timeout: 30000 });
      if (key === 'single') {
        await expect(page.getByTestId('other-place-units')).toHaveCount(0);
        await expect(page.getByText('Utilities on this listing', { exact: true })).toHaveCount(1);
      } else {
        const noun = key === 'rooms' ? 'rooms' : key === 'beds' ? 'beds' : 'apartments';
        const place = key === 'building' ? 'building' : 'apartment';
        await expect(page.getByText(`Other ${noun} in this ${place} (2)`, { exact: true })).toHaveCount(1);
        await expect(page.getByTestId('unit-utilities')).toContainText('24/7 Generator');
        await expect(page.getByTestId('unit-utilities')).toContainText('Not specified');
        await expect(page.getByTestId('place-utilities')).toContainText('Solar');
        await expect(page.getByTestId('place-details')).toContainText('Not available for this');
        await expect(page.getByTestId('unit-details')).not.toContainText('100Mbps');
        await expect(page.getByTestId('place-photos')).toContainText('Shared photo 1');
        if (key === 'beds') await expect(page.getByTestId('unit-details')).toContainText('2 of 4 available');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${key} at ${width} must not overflow`);
      await page.screenshot({ path: path.join(output, `${key}-${width}.png`), fullPage: true });
      if (key !== 'single') {
        await page.getByTestId('other-place-units').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${key}-${width}-selector.png`) });
        {
          const sectionRole = width < 900 ? 'tab' : 'link';
          await page.getByRole(sectionRole, { name: key === 'rooms' ? 'This room' : key === 'beds' ? 'This bed' : 'This apartment', exact: true }).click();
          await expect(page.getByTestId('unit-details').getByRole('heading').first()).toBeInViewport();
          await page.screenshot({ path: path.join(output, `${key}-${width}-ownership.png`) });
          await page.getByRole(sectionRole, { name: key === 'building' ? 'The building' : 'The apartment', exact: true }).click();
          await expect(page.getByTestId('place-details').getByRole('heading').first()).toBeInViewport();
          await page.screenshot({ path: path.join(output, `${key}-${width}-shared.png`) });
        }
      }
      checks.push(`${key}: ${width}px real exported route, ownership, galleries and no overflow`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/listing/rooms');
  await page.getByRole('button', { name: 'Under offer', exact: true }).click();
  await expect(page.getByTestId('sibling-unit-rooms-a')).toHaveCount(0);
  await expect(page.getByTestId('sibling-unit-rooms-b')).toHaveCount(1);
  await page.getByLabel('Maximum monthly rent in USD').fill('300');
  await expect(page.getByText('No units match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByText('Showing 2 of 2')).toBeVisible();
  await page.getByTestId('sibling-unit-rooms-a').click();
  await expect(page).toHaveURL(/\/listing\/rooms-a$/);
  const activeUnitUtilities = page.locator('[data-testid="unit-utilities"]:visible');
  await expect(activeUnitUtilities).toHaveCount(1);
  await expect(activeUnitUtilities).not.toContainText('24/7 Generator');
  await expect(page.locator('[data-testid="place-utilities"]:visible')).toContainText('Solar');
  checks.push('stored pending + max-rent filters, clear, navigation and inherited electricity after reset');
  await page.getByRole('button', { name: 'Open apartment photos 1', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Close shared photos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next shared photo', exact: true }).click();
  await expect(page.getByText('Apartment photos · 2 / 2 · Shared photo 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close shared photos', exact: true }).click();
  checks.push('shared gallery lightbox, ordering and captions');
  siblings.rooms.push({ ...unit('rooms-c', 'shared_bed'), title: 'Shared room option' });
  await page.goto(base + '/listing/rooms');
  await expect(page.getByText('Other units in this apartment (3)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Shared beds (1)', exact: true }).click();
  await expect(page.getByTestId('sibling-unit-rooms-c')).toHaveCount(1);
  await expect(page.getByTestId('sibling-unit-rooms-a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Private rooms (2)', exact: true }).click();
  await expect(page.getByTestId('sibling-unit-rooms-c')).toHaveCount(0);
  await expect(page.getByTestId('sibling-unit-rooms-a')).toHaveCount(1);
  siblings.rooms.pop();
  checks.push('mixed-unit heading and counted type filters');
  failSiblings = true;
  await page.goto(base + '/listing/rooms');
  await expect(page.getByRole('button', { name: 'Retry other units' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByTestId('unit-details')).toContainText('This room');
  failSiblings = false;
  await page.getByRole('button', { name: 'Retry other units' }).click();
  await expect(page.getByText('Showing 2 of 2')).toBeVisible();
  checks.push('sibling failure leaves unit usable and retry recovers');
  const hydration = errors.filter(message => /Hydration|hydration|Minified React error #418/.test(message));
  const unexpected = errors.filter(message => !hydration.includes(message));
  assert.deepEqual(unexpected, []);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ checks, hydrationWarnings: hydration.length }, null, 2));
  console.log(JSON.stringify({ checks, hydrationWarnings: hydration.length }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
