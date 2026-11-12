// Real exported Expo detail routes. Only API responses and local fixture media
// are controlled; the desktop/mobile shells, hooks and navigation are real.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const frontend = path.resolve(import.meta.dirname, '..');
const root = path.resolve(frontend, process.env.DETAIL_EXPORT_DIR ?? '.expo/detail-export');
const spa = !existsSync(path.join(root, 'listing/[id].html'));
const output = path.resolve(frontend, process.env.DETAIL_SCREENSHOT_DIR ?? '.expo/detail-dedup-ui');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (/^\/listing\/[^/]+$/.test(pathname)) target = path.join(root, spa ? 'index.html' : 'listing/[id].html');
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
// Fixtures represent already resolved API values, without changing inheritance logic.
const inheritedDefaults = { ...defaults, electricity: 'generator_24_7', conciergeIncluded: true };
fixtures.inherited = {
  ...unit('inherited', 'private_room', 'building'), ...inheritedDefaults,
  title: 'Inherited building services', addressLine: '24 Bliss Street',
  hasFiber: false, generatorSpecs: '10 A generator', routerUpsHours: 8,
  placeContext: { isMultiUnit: true, defaults: inheritedDefaults,
    sources: Object.fromEntries(Object.keys(inheritedDefaults).filter(k => k !== 'amenities').map(k => [k, 'place'])),
    amenitySources: { balcony: 'place', parking: 'place' }, unitAmenities: [], amenityOverrides: {} },
};
fixtures.overridden = {
  ...fixtures.inherited, id: 'overridden', title: 'Unit with service overrides',
  electricity: 'scheduled_cuts', electricityCutWindows: [{ start: '14:00', end: '16:00' }], electricityHoursOn: 22,
  wifiIncluded: false, hasElevator: false, elevator24_7: false,
  petsPolicy: 'yes', generatorIncluded: false, amenities: ['balcony', 'study_desk'],
  placeContext: { ...fixtures.inherited.placeContext,
    sources: { ...fixtures.inherited.placeContext.sources,
      ...Object.fromEntries(['electricity', 'electricityCutWindows', 'electricityHoursOn', 'wifiIncluded', 'hasElevator', 'elevator24_7', 'petsPolicy', 'generatorIncluded'].map(k => [k, 'unit'])) },
    amenitySources: { balcony: 'place', parking: 'unit', study_desk: 'unit' },
    unitAmenities: ['study_desk'], amenityOverrides: { parking: false } },
};
const emptyDefaults = { electricity: 'solar', water: 'tank_delivery', wifiIncluded: false, routerUps: false,
  hasElevator: true, elevator24_7: true, hasSolar: false, conciergeIncluded: false, amenities: ['balcony'] };
fixtures.empty = {
  ...fixtures.inherited, ...emptyDefaults, id: 'empty', title: 'Building without extra details',
  buildingName: null, addressLine: null, sharedPhotos: [], hasElevator: true, elevator24_7: false,
  placeContext: { ...fixtures.inherited.placeContext, defaults: emptyDefaults, amenityOverrides: {} },
};
const siblings = Object.fromEntries(Object.entries(fixtures).map(([key, value]) => [key, key === 'single' ? [] : [
  { ...value, id: key + '-a', title: 'Courtyard option', monthlyRentUsd: 280, electricity: 'solar', placeContext: { ...value.placeContext, sources: { ...value.placeContext.sources, electricity: 'place' } } },
  { ...value, id: key + '-b', title: 'Balcony option', monthlyRentUsd: 420, availability: 'pending' },
]]));
let failSiblings = false;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const checks = [], errors = [];
async function finishHighlights(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    document.getAnimations().forEach(animation => {
      if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    });
  });
}
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
      await expect(page.getByText('Utilities on this listing', { exact: true })).toHaveCount(1);
      if (key === 'single') {
        await expect(page.getByTestId('other-place-units')).toHaveCount(0);
        await expect(page.getByTestId('place-intro')).toHaveCount(0);
      } else {
        const noun = key === 'rooms' ? 'rooms' : key === 'beds' ? 'beds' : 'apartments';
        const place = key === 'building' ? 'building' : 'apartment';
        await expect(page.getByText(`Other ${noun} in this ${place} (2)`, { exact: true })).toHaveCount(1);
        await expect(page.getByTestId('listing-utilities')).toContainText('24/7 Generator');
        await expect(page.getByTestId('place-extras')).toContainText('Solar backup');
        await expect(page.getByTestId('place-details')).not.toContainText('Different for this');
        await expect(page.getByTestId('place-excluded-amenities')).toHaveText(`In the ${place}, not in this unit: Dedicated parking`);
        await expect(page.getByTestId('place-photos')).toContainText('2 photos');
        await expect(page.getByTestId('place-details').getByRole('button', { name: /shared details/ })).toHaveCount(0);
        await expect(page.getByTestId('place-rules')).toHaveCount(0);
        await expect(page.getByTestId('place-other-utilities')).toHaveCount(0);
        if (key === 'beds') await expect(page.getByText('2 of 4 available', { exact: true })).toBeVisible();
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${key} at ${width} must not overflow`);
      await page.screenshot({ path: path.join(output, `${key}-${width}.png`), fullPage: true });
      if (key !== 'single') {
        await page.getByTestId('other-place-units').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${key}-${width}-selector.png`) });
        {
          const sectionRole = width < 900 ? 'tab' : 'link';
          await page.getByRole(sectionRole, { name: 'Other units', exact: true }).click();
          await expect(page.getByTestId('other-place-units').getByRole('heading').first()).toBeInViewport();
          await page.screenshot({ path: path.join(output, `${key}-${width}-ownership.png`) });
          await page.getByRole(sectionRole, { name: key === 'building' ? 'The building' : 'The apartment', exact: true }).click();
          await expect(page.getByTestId('place-details').getByRole('heading').first()).toBeInViewport();
          await page.screenshot({ path: path.join(output, `${key}-${width}-shared.png`) });
        }
      }
      checks.push(`${key}: ${width}px real exported route, ownership, galleries and no overflow`);
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    for (const key of ['inherited', 'overridden', 'empty']) {
      await page.goto(base + '/listing/' + key);
      await expect(page.getByTestId('listing-utilities')).toBeVisible({ timeout: 30000 });
      const utilities = page.getByTestId('listing-utilities');
      const building = page.getByTestId('place-details');
      const navRole = width < 900 ? 'tab' : 'link';
      const unitSection = page.locator('#listing-unit, [data-testid="listing-unit"]');
      const aboutSection = page.locator('#listing-about, [data-testid="listing-about"]');
      const amenitiesSection = page.locator('#listing-amenities, [data-testid="listing-amenities"]');
      const orderedSections = [utilities, unitSection, aboutSection,
        ...(key === 'empty' ? [] : [building]), amenitiesSection];
      for (let i = 1; i < orderedSections.length; i++) {
        const next = await orderedSections[i].elementHandle();
        assert.ok(await orderedSections[i - 1].evaluate((previous, next) =>
          Boolean(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING), next),
          `${key} at ${width}: utilities, unit, about, building, amenities follow the same order`);
      }
      const orderedNav = [page.getByRole(navRole, { name: 'The unit', exact: true }),
        page.getByRole(navRole, { name: width < 900 ? 'Description' : 'About', exact: true }),
        ...(key === 'empty' ? [] : [page.getByRole(navRole, { name: 'The building', exact: true })]),
        page.getByRole(navRole, { name: 'Amenities', exact: true })];
      if (width >= 900) orderedNav.unshift(page.getByRole('link', { name: 'Utilities', exact: true }));
      for (let i = 1; i < orderedNav.length; i++) {
        const next = await orderedNav[i].elementHandle();
        assert.ok(await orderedNav[i - 1].evaluate((previous, next) =>
          Boolean(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING), next),
          `${key} at ${width}: navigation matches the section order`);
      }
      await expect(page.getByText('Elevator', { exact: true })).toHaveCount(1);
      await expect(page.getByTestId('listing-elevator')).toContainText(
        `Elevator${key === 'inherited' ? 'Available 24/7' : key === 'overridden' ? 'Not available' : 'Available'}`);
      if (key === 'empty') {
        await expect(building).toHaveCount(0);
        await expect(page.getByRole(navRole, { name: 'The building', exact: true })).toHaveCount(0);
      } else {
        await expect(building).toContainText('Bliss House · 24 Bliss Street');
        await expect(building).not.toContainText('Elevator');
        await expect(building).toContainText('Solar backupAvailable');
        await expect(building).toContainText('ConciergeIncluded in rent');
        for (const removed of ['Power', 'Water', 'Wi-Fi', 'Generator', 'Router', 'Smoking', 'Pets', 'Overnight guests', 'Quiet hours', 'Who it is for', 'Different for this', 'Shared amenities']) {
          await expect(building).not.toContainText(removed);
        }
        await expect(building.getByRole('button', { name: /shared details/ })).toHaveCount(0);
        if (key === 'overridden') {
          const excluded = page.getByTestId('place-excluded-amenities');
          await expect(excluded).toHaveText('In the building, not in this unit: Dedicated parking');
          assert.equal(await excluded.evaluate(el => getComputedStyle(el).textDecorationLine), 'none');
          await expect(utilities).toContainText('Scheduled Cuts');
          await expect(utilities).toContainText('22/24');
          await expect(utilities).toContainText('2:00 PM');
          await expect(utilities).toContainText('Ask about Wi');
          await expect(utilities).toContainText('Generator fee billed separately');
          await expect(page.getByTestId('listing-house-rules')).toContainText(/Pets\s*yes/);
          await expect(page.getByTestId('listing-house-rules')).not.toContainText('cats only');
          // Parking is described only as excluded building context, never as a unit amenity.
          await expect(page.getByText('Dedicated parking', { exact: true })).toHaveCount(0);
          await expect(page.getByText('Study desk & chair', { exact: true })).toHaveCount(1);
        } else {
          await expect(page.getByTestId('place-excluded-amenities')).toHaveCount(0);
          await expect(utilities).toContainText('24/7 Generator');
          await expect(utilities).toContainText('Generator fee included');
          await expect(page.getByTestId('listing-house-rules')).toContainText(/Pets\s*cats only/);
          await expect(page.getByText('Dedicated parking', { exact: true })).toHaveCount(1);
        }
      }
      if (width < 900) {
        const badges = page.getByTestId('detail-utility-badges');
        if (key === 'empty') await expect(badges).toHaveCount(0);
        else {
          const expected = key === 'inherited' ? ['24/7 power', 'Wi-Fi included', '24/7 water'] : ['24/7 water', 'Router backup'];
          assert.deepEqual(await badges.locator(':scope > div').evaluateAll(nodes => nodes.map(node => node.lastElementChild.textContent)), expected.map(label => label));
          await expect(badges).not.toContainText('+');
        }
        await page.screenshot({ path: path.join(output, `${key}-mobile-header.png`) });
        await page.getByTestId('listing-elevator').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${key}-mobile-utilities.png`) });
        if (key !== 'empty') {
          await page.getByRole('tab', { name: 'The building', exact: true }).click();
          await expect(building.getByRole('heading')).toBeInViewport();
          const tab = page.getByRole('tab', { name: 'The building', exact: true });
          await expect.poll(async () => (await tab.boundingBox())?.y ?? Infinity).toBeLessThan(90);
          await page.getByRole('tab', { name: 'Description', exact: true }).click();
          await expect.poll(async () => (await aboutSection.boundingBox())?.y ?? -Infinity).toBeGreaterThanOrEqual(40);
          await expect(aboutSection.getByText('About the property', { exact: true })).toBeInViewport();
          await finishHighlights(page);
          await page.screenshot({ path: path.join(output, `${key}-mobile.png`) });
        } else {
          await page.getByRole('tab', { name: 'Amenities', exact: true }).click();
          await expect(page.getByText('Balcony / terrace', { exact: true })).toBeInViewport();
          const tabBar = page.getByRole('tab', { name: 'Amenities', exact: true });
          await expect.poll(async () => (await tabBar.boundingBox())?.y ?? -1,
            { message: 'tabs stay sticky when the building is hidden' }).toBeGreaterThanOrEqual(0);
          await expect.poll(async () => (await tabBar.boundingBox())?.y ?? Infinity,
            { message: 'tabs stay sticky when the building is hidden' }).toBeLessThan(90);
          await finishHighlights(page);
          await page.screenshot({ path: path.join(output, 'empty-mobile.png') });
        }
      } else {
        await page.getByRole('link', { name: 'Utilities', exact: true }).click();
        await finishHighlights(page);
        await page.screenshot({ path: path.join(output, `${key}-desktop-utilities.png`) });
        await page.getByRole('link', { name: key === 'empty' ? 'Utilities' : 'The building', exact: true }).click();
        await expect((key === 'empty' ? utilities : building)).toBeInViewport();
        await finishHighlights(page);
        await page.getByRole('link', { name: 'The unit', exact: true }).click();
        await expect(unitSection).toBeInViewport();
        await finishHighlights(page);
        await page.screenshot({ path: path.join(output, `${key}-desktop.png`) });
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      checks.push(`${key}: ${width}px effective elevator only, building contents, unit-first order, matching navigation and sticky tabs`);
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
  const activeUnitUtilities = page.locator('[data-testid="listing-utilities"]:visible');
  await expect(activeUnitUtilities).toHaveCount(1);
  await expect(activeUnitUtilities).not.toContainText('24/7 Generator');
  await expect(activeUnitUtilities).toContainText('Solar');
  await expect(page.locator('[data-testid="place-extras"]:visible')).toContainText('Solar backup');
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
  await expect(page.getByText('Utilities on this listing', { exact: true })).toBeVisible();
  await expect(page.getByText('Sunny private room on Bliss').first()).toBeVisible();
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
