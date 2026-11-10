import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const phase = process.env.MAP_PIN_BASELINE_PHASE ?? 'step7';
const output = path.resolve(import.meta.dirname, '../.expo/map-pin-baseline', phase);
const liveStyle = process.env.MAP_PIN_LIVE_STYLE === '1';
const campus = { slug: 'aub', id: 'test-aub', name: 'American University of Beirut', mapLabel: 'AUB', lat: 33.900, lng: 35.482 };
const otherCampus = { ...campus, slug: 'test-other', id: 'test-other', name: 'Other Campus', mapLabel: 'Other', lat: 33.899, lng: 35.487 };
const unit = (id, placeId, price, lat, lng) => ({
  id, placeId, title: `Baseline ${id}`, monthlyRentUsd: price, lat, lng,
  status: 'active', availability: 'available', area: 'Hamra', listingType: 'private_room',
  electricity: 'solar', water: 'state_well_24_7', wifiIncluded: true,
  priceBasis: 'per_room_month', targetAudience: 'students_only', genderRestriction: 'anyone',
  nearestCampusSlug: 'aub', distanceMeters: 750, photos: [],
  createdAt: '2026-09-01', expiresAt: '2099-01-01',
});
const units = [unit('room-a', 'shared', 500, 33.899, 35.48), unit('room-b', 'shared', 300, 33.899, 35.48),
  unit('nearby', 'nearby', 420, 33.8991, 35.4801), unit('east', 'east', 650, 33.890, 35.54)];
const mapHost = page => page.locator('.studently-mapbox-map--chrome-offset');
const cardHost = (page, mobile) => mobile ? page.getByTestId('mobile-map-selection') : mapHost(page);
const activate = (locator, mobile) => mobile ? locator.tap({ timeout: 8_000 }) : locator.click({ timeout: 8_000 });
const fixtureState = new WeakMap();

// The app is unmodified: inspect its existing React ref to the real Mapbox map.
// This hook lives only in Playwright, never in the production/native bundles.
async function mapState(page, action = 'read', argument, selector = '.studently-mapbox-map--chrome-offset') {
  return page.evaluate(({ action, argument, selector }) => {
    const host = document.querySelector(selector);
    if (!host) return null;
    const key = Object.keys(host).find(key => key.startsWith('__reactFiber$'));
    let fiber = key ? host[key] : null;
    // Host-node pointers can reference the alternate tree after a React update.
    // Read committed props for the source-array identity assertion below.
    if (fiber) {
      let root = fiber;
      while (root.return) root = root.return;
      const stack = [root.stateNode?.current ?? root];
      while (stack.length) {
        const candidate = stack.pop();
        if (candidate.stateNode === host) { fiber = candidate; break; }
        if (candidate.sibling) stack.push(candidate.sibling);
        if (candidate.child) stack.push(candidate.child);
      }
    }
    let map;
    let componentProps;
    while (fiber && !map) {
      let hook = fiber.memoizedState;
      while (hook && !map) {
        const value = hook.memoizedState?.current;
        if (value && typeof value.getCenter === 'function' && typeof value.getZoom === 'function') {
          map = value;
          componentProps = fiber.memoizedProps;
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    if (!map) return null;
    if (action === 'jump') { map.stop(); map.jumpTo(argument); }
    if (action === 'pan') map.panBy([100, 0], { duration: 0 });
    if (action === 'observePreviewFit') {
      map.__testPreviewFits = [];
      const fitBounds = map.fitBounds.bind(map);
      map.fitBounds = (...args) => { map.__testPreviewFits.push(args[1]); return fitBounds(...args); };
    }
    if (action === 'observeTapInput') {
      map.__testTapInput = [];
      for (const type of ['click', 'dblclick', 'zoomstart', 'zoomend']) map.on(type, event => map.__testTapInput.push({ type,
        original: event.originalEvent?.type, zoom: map.getZoom(), time: performance.now() }));
    }
    if (action === 'observeClickCamera') {
      map.__testClickCameras = [];
      const easeTo = map.easeTo.bind(map);
      map.easeTo = (options, ...rest) => { map.__testClickCameras.push({ ...options, kind: rest[0]?.studentlyCameraKind }); return easeTo(options, ...rest); };
    }
    if (action === 'reloadStyle') map.setStyle({ version: 8, sources: {}, layers: [
      { id: 'baseline-background', type: 'background', paint: { 'background-color': '#e8eef4' } },
    ] }, { diff: false });
    const source = map.getSource('studently-listing-points');
    const activeSource = map.getSource('studently-active-listing-points');
    if (action === 'delayClusterZoom' && source) {
      const getZoom = source.getClusterExpansionZoom.bind(source);
      source.getClusterExpansionZoom = (id, callback) => getZoom(id, (...result) => { map.__releaseClusterZoom = () => callback(...result); });
    }
    if (action === 'releaseClusterZoom') { const reply = map.__releaseClusterZoom; map.__releaseClusterZoom = null; reply?.(); }
    if (action === 'removePinImage' && source) {
      const feature = source.serialize().data.features.find(item => item.properties.groupId === argument.groupId);
      if (feature) map.removeImage(feature.properties.image);
    }
    if (action === 'observeLayerData' && source) {
      if (!map.__testLayerErrors) {
        map.__testLayerErrors = [];
        map.on('error', event => map.__testLayerErrors.push(event.error?.message ?? String(event.error)));
      }
      for (const observed of [source, activeSource].filter(Boolean)) {
        observed.__testWrites = 0;
        if (!observed.__testWrapped) {
          const setData = observed.setData.bind(observed);
          observed.setData = (...args) => { observed.__testWrites++; return setData(...args); };
          observed.__testWrapped = true;
        }
      }
    }
    if (action === 'observe') {
      const probe = { listings: componentProps.listings, moves: 0 };
      host.__mapPinTestProbe = probe;
      map.on('movestart', () => probe.moves++);
    }
    if (action === 'observeReload') host.__reloadProbe = { map, canvas: map.getCanvas(),
      pins: [...host.querySelectorAll('.studently-marker-el')].filter(node => node.querySelector('.studently-price-stack')) };
    const probe = host.__mapPinTestProbe;
    const canvas = map.getCanvas();
    const center = map.getCenter();
    // React publishes the map ref before Mapbox can serialize its loaded style.
    const layers = map.isStyleLoaded() ? map.getStyle()?.layers ?? [] : [];
    const rendered = map.getLayer('studently-listing-pins')
      ? map.queryRenderedFeatures({ layers: ['studently-listing-pins', 'studently-listing-clusters', 'studently-active-listing-pin'].filter(id => map.getLayer(id)) }) : [];
    return {
      center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), moving: map.isMoving(),
      canvasWidth: canvas.clientWidth, canvasHeight: canvas.clientHeight,
      layers: layers.map(layer => layer.id),
      styleLoaded: map.isStyleLoaded(),
      loaded: map.loaded(),
      sourceLoaded: source ? map.isSourceLoaded('studently-listing-points') : false,
      tilesLoaded: map.areTilesLoaded(),
      probe: probe ? { moves: probe.moves, sameListingArray: probe.listings === componentProps.listings } : null,
      mapPrices: Object.fromEntries((componentProps.listings ?? []).map(listing => [listing.id, listing.monthlyRentUsd])),
      layerData: source?.serialize().data ?? null,
      layerWrites: source?.__testWrites ?? null,
      activeData: activeSource?.serialize().data ?? null,
      activeWrites: activeSource?.__testWrites ?? null,
      activePins: [...new Map(rendered.filter(feature => feature.layer.id === 'studently-active-listing-pin'
        && map.getFeatureState({ source: 'studently-active-listing-points', id: feature.properties.groupId }).active)
        .map(feature => [feature.properties.groupId, feature.properties])).values()],
      layerImages: map.isStyleLoaded() ? map.listImages().filter(id => id.startsWith('studently-price-image:') || id.startsWith('studently-cluster-count:')) : [],
      layerPins: [...new Map(rendered.filter(feature => feature.layer.id === 'studently-listing-pins').map(feature => [feature.properties.groupId, feature.properties])).values()],
      layerClusters: [...new Map(rendered.filter(feature => feature.layer.id === 'studently-listing-clusters').map(feature => [feature.properties.cluster_id, { ...feature.properties, coordinates: feature.geometry.coordinates }])).values()],
      projected: argument?.coordinates ? map.project(argument.coordinates) : null,
      featureState: source && argument?.groupId ? map.getFeatureState({ source: 'studently-listing-points', id: argument.groupId }) : null,
      activeFeatureState: activeSource && argument?.groupId ? map.getFeatureState({ source: 'studently-active-listing-points', id: argument.groupId }) : null,
      layerErrors: map.__testLayerErrors ?? [],
      clickCameras: map.__testClickCameras ?? [],
      previewFits: map.__testPreviewFits ?? [],
      reloadProbe: host.__reloadProbe ? { sameMap: host.__reloadProbe.map === map,
        sameCanvas: host.__reloadProbe.canvas === canvas,
        oldMarkersConnected: host.__reloadProbe.pins.every(pin => pin.isConnected) } : null,
      clusterReplyPending: Boolean(map.__releaseClusterZoom),
      tapInput: map.__testTapInput ?? [],
    };
  }, { action, argument, selector });
}

test.beforeEach(async ({ page }) => {
  await mkdir(output, { recursive: true });
  const state = { reversed: false, many: false, distinct: false, onlyShared: false, priceDelta: 0, promotionRevision: 0, eastShift: 0, sharedShift: 0 };
  fixtureState.set(page, state);
  await page.route('https://api.mapbox.com/mapbox-gl-js/**/mapbox-gl.css', async route => route.fulfill({
    contentType: 'text/css', body: await readFile(path.resolve(import.meta.dirname, '../node_modules/mapbox-gl/dist/mapbox-gl.css'), 'utf8'),
  }));
  // A controlled empty basemap removes external tile timing from pin/route tests.
  // Mapbox GL itself, projection, gestures, popups, and route layers are real.
  if (!liveStyle) await page.route('https://api.mapbox.com/styles/v1/**', route => route.fulfill({ json: {
    version: 8, name: 'Map pin baseline', sources: {},
    layers: [{ id: 'baseline-background', type: 'background', paint: { 'background-color': '#e8eef4' } }],
  } }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/universities') return route.fulfill({ json: { data: [campus, otherCampus] } });
    if (url.pathname === '/api/institutions') return route.fulfill({ json: { data: [] } });
    if (url.pathname.endsWith('/walking-route')) {
      const id = url.pathname.split('/')[3];
      const base = units.find(item => item.id === id) ?? units[0];
      const listing = { ...base, lng: base.lng + (base.id === 'east' ? state.eastShift : base.placeId === 'shared' ? state.sharedShift : 0) };
      return route.fulfill({ json: { data: { status: 'ok', distanceM: 750, durationS: 600,
        coords: [{ lat: campus.lat, lng: campus.lng }, { lat: 33.9002, lng: listing.lng }, { lat: listing.lat, lng: listing.lng }] } } });
    }
    if (url.pathname === '/api/listings') {
      if (url.searchParams.get('view') === 'map' && state.mapGate) {
        state.mapRequestPending = true;
        await state.mapGate;
      }
      let matches = state.many ? [...units, ...Array.from({ length: 18 }, (_, index) => unit(`extra-${index}`, 'shared', 800 + index, 33.899, 35.48))] : units;
      if (state.distinct) matches = [...matches, ...Array.from({ length: 48 }, (_, index) => unit(`spread-${index}`, `spread-${index}`, 400 + index,
        33.899 + Math.sin(index * 2.4) * 0.003 * (index + 1), 35.48 + Math.cos(index * 2.4) * 0.003 * (index + 1)))];
      if (state.onlyShared) matches = matches.filter(listing => listing.placeId === 'shared');
      if (url.searchParams.get('listingTypes') === 'pbsa_building') matches = matches.filter(listing => listing.id === 'east');
      matches = matches.map(listing => ({ ...listing, lng: listing.lng + (listing.id === 'east' ? state.eastShift : listing.placeId === 'shared' ? state.sharedShift : 0), monthlyRentUsd: listing.monthlyRentUsd + state.priceDelta,
        promotion: { campaignId: 'fixture', type: 'bump', position: 0, marketKey: 'fixture', endsAt: '2099-01-01', lastBumpedAt: null,
          token: `fixture-${state.promotionRevision}`, sessionId: 'fixture' } }));
      if (url.searchParams.get('listingTypes') === 'studio') matches = [];
      return route.fulfill({ json: {
        data: state.reversed ? [...matches].reverse() : matches, featured: [], campuses: url.searchParams.has('universitySlugs')
          ? (state.reversed ? [otherCampus, campus] : [campus, otherCampus]) : [],
        pagination: { page: 1, pageSize: 24, total: matches.length, totalMatching: matches.length, hasNext: false },
      } });
    }
    return route.fulfill({ json: { data: [] } });
  });
});

async function openMap(page, query = '') {
  await page.goto(`/search${query}`);
  await expect(page.getByTestId('result-card-room-a')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Explore on map/i }).click();
  await page.mouse.move(5, 5);
  await expect(mapHost(page).locator('.mapboxgl-canvas')).toBeAttached({ timeout: 30_000 });
  await expect.poll(() => mapState(page)).not.toBeNull();
  await expect.poll(async () => (await mapState(page))?.styleLoaded, { timeout: 30_000 }).toBe(true);
  if (!liveStyle) await expect.poll(async () => (await mapState(page))?.layers.includes('baseline-background')).toBe(true);
  // The current map schedules its initial fit 80ms after readiness.
  await page.waitForTimeout(300);
  await expect.poll(async () => (await mapState(page))?.moving).toBe(false);
}

// Legacy DOM assertions deliberately qualify the retained rollback renderer.
async function openMarkerMap(page, query = '') {
  const params = new URLSearchParams(query);
  params.set('mapPins', 'markers');
  await openMap(page, `?${params}`);
}

test('price grouping, clusters, selection retention and full-width mobile map', async ({ page }, info) => {
  const requests = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/listings') requests.push(request.url()); });
  await openMarkerMap(page);
  const mobile = info.project.name === 'mobile-web';
  const initial = await mapState(page);
  if (mobile) {
    expect(initial.canvasWidth).toBe(390);
    await expect(page.getByTestId('result-card-room-a')).toHaveCount(0);
    await page.screenshot({ path: path.join(output, 'mobile-full-width-map.png') });
  } else {
    expect(initial.canvasWidth).toBeGreaterThan(900);
    const preview = page.locator('.studently-mapbox-map').first();
    // Sidebar is unmounted while the main map is open; the baseline checks it below.
    await expect(preview).toBeAttached();
  }
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await expect(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' })).toHaveCount(1);
  const beforeMovement = requests.length;
  await mapState(page, 'pan');
  await expect.poll(() => mapState(page).then(value => value.center[0])).not.toBe(35.48);
  expect(requests.length).toBe(beforeMovement);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(cardHost(page, mobile).locator('.studently-popup-group-item')).toHaveCount(2);
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await expect(mapHost(page).locator('.studently-cluster-bubble')).toHaveCount(1);
  await expect(mapHost(page).locator('.studently-cluster-bubble')).toHaveText('2');
  await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(1);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await mapState(page, 'pan');
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(0);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await activate(mapHost(page).locator('.studently-cluster-bubble'), mobile);
  await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(16);
  await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer', 'markers');
  await page.screenshot({ path: path.join(output, `${info.project.name}-selected-and-expanded.png`) });
  await writeFile(path.join(output, `${info.project.name}-standard.json`), JSON.stringify({
    initial, final: await mapState(page), listingRequestCount: requests.length,
    groupedLabel: '$300 · 2', clusterPlaces: 2, selectedPopupSurvivedZoomAndPan: true,
    mobileFullWidthWithoutTestWorkaround: mobile,
  }, null, 2));
});

test('university route, popup replacement guards, arrows and pitch controls', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMarkerMap(page, '?universitySlugs=aub');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await expect(mapHost(page).locator('.studently-campus-stack')).toHaveCount(2);
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  await expect.poll(async () => (await mapState(page)).layers.includes('studently-campus-line-layer')).toBe(true);
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  const side = mobile ? 'bottom' : await mapHost(page).locator('.mapboxgl-popup').getAttribute('data-studently-side');
  expect(['n', 's', 'e', 'w', 'bottom']).toContain(side);
  await mapState(page, 'jump', { center: [35.55, 33.89], zoom: 18 });
  await expect(page.getByRole('button', { name: /Show .* on the map/ }).first()).toBeVisible();
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await mapHost(page).getByRole('button', { name: 'Switch to 3D map' }).click();
  await expect.poll(async () => (await mapState(page)).pitch).toBe(60);
  await mapHost(page).getByRole('button', { name: 'Switch to 2D map' }).click();
  await expect.poll(async () => (await mapState(page)).pitch).toBe(0);
  await page.screenshot({ path: path.join(output, `${info.project.name}-university.png`) });
  await writeFile(path.join(output, `${info.project.name}-university.json`), JSON.stringify({
    popupCount: await mapHost(page).locator('.mapboxgl-popup').count(), side,
    distance: await mapHost(page).locator('.studently-dist-badge').textContent(),
    arrows: await page.getByRole('button', { name: /Show .* on the map/ }).count(),
    final: await mapState(page),
  }, null, 2));
});

test('renderer flag selects the same web mode in browse and desktop preview', async ({ page }, info) => {
  for (const request of ['markers', 'layers', 'invalid', '']) {
    await openMap(page, request ? `?mapPins=${request}` : '');
    const activeMode = request === 'markers' ? 'markers' : 'layers';
    const source = ['markers', 'layers'].includes(request) ? 'url' : 'default';
    await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer', activeMode);
    await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer-requested', activeMode);
    await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer-source', source);
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
    if (activeMode === 'layers') {
      await expect.poll(async () => (await mapState(page)).layers.includes('studently-listing-pins')).toBe(true);
      await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
    } else await expect(mapHost(page).locator('.studently-marker-el').first()).toBeAttached();
    if (info.project.name === 'desktop') {
      await page.getByRole('button', { name: 'Close map', exact: true }).click();
      const preview = page.locator('.studently-mapbox-map[aria-hidden]');
      await expect(preview).toHaveAttribute('data-map-pin-renderer', activeMode);
      await expect(preview).toHaveAttribute('data-map-pin-renderer-requested', activeMode);
      await expect(preview).toHaveAttribute('data-map-pin-renderer-source', source);
      if (activeMode === 'layers') {
        await expect.poll(async () => (await mapState(page, 'read', undefined, '.studently-mapbox-map[aria-hidden]'))?.layerData?.features?.length).toBe(3);
        await expect(preview.locator('.studently-price-pill')).toHaveCount(0);
      } else await expect(preview.locator('.studently-price-pill')).toHaveCount(3);
    }
  }
});

for (const university of [false, true]) test(`layer default without a renderer override qualifies ${university ? 'university' : 'standard'} browse`, async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/listings' && url.searchParams.get('view') === 'map') requests.push(url.search);
  });
  await openMap(page, university ? '?universitySlugs=aub' : '');
  expect(new URL(page.url()).searchParams.has('mapPins')).toBe(false);
  await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer', 'layers');
  await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer-source', 'default');
  await expect.poll(async () => (await mapState(page)).layerData?.features.length).toBe(3);
  const initial = await mapState(page);
  const shared = initial.layerData.features.find(feature => feature.id === 'place:shared');
  expect(shared.properties.price).toBe(300);
  expect(shared.properties.memberCount).toBe(2);
  if (mobile) expect(initial.canvasWidth).toBe(390);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18, pitch: 0, bearing: 0 });
  await settleMapCapture(page);
  await mapState(page, 'observeLayerData');
  const movementRequests = requests.length;
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(cardHost(page, mobile).locator('.studently-popup-group-item')).toHaveCount(2);
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  if (university) await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  await settleMapCapture(page);
  const selected = await mapState(page);
  await page.screenshot({ path: path.join(output, `${info.project.name}-default-${university ? 'university' : 'standard'}-selected.png`) });
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await settleMapCapture(page);
  const clustered = await mapState(page);
  expect(clustered.layerClusters.some(cluster => cluster.point_count === 2)).toBe(true);
  expect(clustered.activePins.some(pin => pin.groupId === 'place:shared')).toBe(true);
  expect(clustered.layerWrites).toBe(0);
  expect(clustered.activeWrites).toBe(0);
  await expect(mapHost(page).locator('.studently-price-stack,.studently-cluster-bubble')).toHaveCount(0);
  await mapState(page, 'pan');
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  expect(requests.length).toBe(movementRequests);
  const canvas = await mapHost(page).locator('.mapboxgl-canvas').elementHandle();
  await page.getByRole('button', { name: 'Close map', exact: true }).click();
  if (!mobile) {
    const preview = page.locator('.studently-mapbox-map[aria-hidden]');
    await expect(preview).toHaveAttribute('data-map-pin-renderer', 'layers');
    await expect(preview).toHaveAttribute('data-map-pin-renderer-source', 'default');
    await expect.poll(async () => (await mapState(page, 'read', undefined, '.studently-mapbox-map[aria-hidden]'))?.layerData?.features.length).toBe(3);
    await expect(preview.locator('.studently-price-stack')).toHaveCount(0);
  }
  await page.getByRole('button', { name: /Explore on map/i }).click();
  await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer-source', 'default');
  expect(await canvas.evaluate(node => node === document.querySelector('.studently-mapbox-map--chrome-offset .mapboxgl-canvas'))).toBe(true);
  const final = await mapState(page);
  expect(final.layerErrors).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(path.join(output, `${info.project.name}-default-${university ? 'university' : 'standard'}.json`), JSON.stringify({ initial, selected, clustered, final, errors }, null, 2));
});

for (const query of ['', '?universitySlugs=aub']) test(`60-second polling preserves selection/camera on reordered results (${query ? 'university' : 'standard'})`, async ({ page }, info) => {
  await page.clock.install();
  const mapRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/listings' && url.searchParams.get('view') === 'map') mapRequests.push(url.search);
  });
  await openMarkerMap(page, query);
  const mobile = info.project.name === 'mobile-web';
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  await mapState(page, 'pan');
  await page.clock.fastForward(1_000);
  await mapState(page, 'observe');
  const marker = mapHost(page).locator('.studently-marker-el').filter({ has: page.locator('.studently-price-pill', { hasText: '$300 · 2' }) });
  await marker.evaluate(node => { node.dataset.stabilityProbe = 'selected'; });
  const before = { requests: mapRequests.length, camera: await mapState(page) };
  fixtureState.get(page).reversed = true;
  fixtureState.get(page).promotionRevision++;
  await page.clock.fastForward(61_000);
  await expect.poll(() => mapRequests.length).toBeGreaterThan(before.requests);
  if (!mobile) await expect(page.getByTestId(/^result-card-/).first()).toHaveAttribute('data-testid', 'result-card-east');
  await page.clock.fastForward(1_000);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(1);
  await expect(marker).toHaveAttribute('data-stability-probe', 'selected');
  const after = await mapState(page);
  expect(after.center).toEqual(before.camera.center);
  expect(after.zoom).toBe(before.camera.zoom);
  expect(after.probe).toEqual({ moves: 0, sameListingArray: true });
  if (query) await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await writeFile(path.join(output, `${info.project.name}-polling-${query ? 'university' : 'standard'}.json`), JSON.stringify({
    before, after: { requests: mapRequests.length, camera: await mapState(page),
      popupCount: await mapHost(page).locator('.mapboxgl-popup').count(),
      bottomCardCount: await page.getByTestId('mobile-map-selection').count(),
      activePricePins: await mapHost(page).locator('.studently-price-stack.on').count() },
    reorderedResultsPreserveSelectionAndCamera: true,
  }, null, 2));
  expect(mapRequests.every(query => !new URLSearchParams(query).has('mapPins'))).toBe(true);
});

test('existing card hover camera behavior and campus switch confirmation', async ({ page }, info) => {
  await openMap(page, '?universitySlugs=aub');
  if (info.project.name === 'desktop') {
    await page.getByTestId('result-card-east').hover();
    await expect.poll(async () => (await mapState(page)).center[0], { timeout: 10_000 }).toBeCloseTo(35.54, 3);
    await page.mouse.move(5, 5);
    // Step 6: stay on this map; leaving hover cannot leave another camera stage.
  }
  await mapState(page, 'jump', { center: [otherCampus.lng, otherCampus.lat], zoom: 17 });
  await mapHost(page).getByRole('button', { name: 'Switch campus to Other' }).click({ timeout: 8_000 });
  await expect(mapHost(page).getByRole('button', { name: 'Switch to this campus' })).toBeVisible();
  await mapHost(page).getByRole('button', { name: 'Keep current campus' }).click();
  await expect(mapHost(page).getByRole('button', { name: 'Switch to this campus' })).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-hover-campus.json`), JSON.stringify({
    universityCardHoverFlyChecked: info.project.name === 'desktop',
    touchHoverFlightNotInvoked: info.project.name === 'mobile-web',
    campusSwitchConfirmationAndCancel: true, camera: await mapState(page),
  }, null, 2));
});

test('parent rerenders stay still, real price edits update, and filter membership resets selection', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await page.clock.install();
  const mapRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/listings' && url.searchParams.get('view') === 'map') mapRequests.push(url.search);
  });
  await openMarkerMap(page);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  await mapState(page, 'observe');
  const before = await mapState(page);
  await activate(page.getByRole('button', { name: 'Filters', exact: true }), mobile);
  const closeFilters = page.getByLabel('Close filters', { exact: true });
  await expect(closeFilters).toBeVisible();
  if (mobile) await closeFilters.tap({ position: { x: 8, y: 8 } });
  else await closeFilters.click({ position: { x: 8, y: 8 } });
  expect((await mapState(page)).probe).toEqual({ moves: 0, sameListingArray: true });
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  const requestsBeforeEdit = mapRequests.length;
  fixtureState.get(page).priceDelta = 25;
  await page.clock.fastForward(61_000);
  await expect.poll(() => mapRequests.length).toBeGreaterThan(requestsBeforeEdit);
  await expect(mapHost(page).locator('.studently-price-pill', { hasText: '$325 · 2' })).toBeVisible();
  await expect(cardHost(page, mobile).locator('.studently-popup-group-price', { hasText: '$325/mo' })).toBeVisible();
  const afterEdit = await mapState(page);
  expect(afterEdit.probe).toEqual({ moves: 0, sameListingArray: false });
  expect(afterEdit.center).toEqual(before.center);
  expect(afterEdit.zoom).toBe(before.zoom);
  await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(1);
  await activate(page.getByLabel('Room type', { exact: true }), mobile);
  await activate(page.getByRole('button', { name: 'Studio', exact: true }), mobile);
  await expect.poll(() => mapRequests.some(query => new URLSearchParams(query).get('listingTypes') === 'studio')).toBe(true);
  await expect(page.getByText('No pins on the map', { exact: true })).toBeVisible();
  await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(0);
  await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-data-updates.json`), JSON.stringify({
    before, afterEdit, actualFilterRefetched: true, selectionClearedOnMembershipChange: true,
  }, null, 2));
});

test('highlight scaling keeps the price-pin tip at its Mapbox anchor', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMarkerMap(page);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  const marker = mapHost(page).locator('.studently-marker-el').filter({ has: page.locator('.studently-price-pill', { hasText: '$300 · 2' }) });
  const geometry = () => marker.evaluate(node => {
    const anchor = node.getBoundingClientRect();
    const tip = node.querySelector('.studently-teardrop .tip').getBoundingClientRect();
    return { bottom: tip.bottom - anchor.bottom, center: (tip.left + tip.right - anchor.left - anchor.right) / 2 };
  });
  const before = await geometry();
  if (!mobile) {
    await page.getByTestId('result-card-room-a').hover();
    await expect(marker.locator('.studently-price-stack.on')).toBeAttached();
    const hovered = await geometry();
    expect(Math.abs(hovered.bottom - before.bottom)).toBeLessThan(0.2);
    expect(Math.abs(hovered.center - before.center)).toBeLessThan(0.2);
    await page.mouse.move(5, 5);
  }
  await activate(marker.locator('.studently-price-pill'), mobile);
  await expect(marker.locator('.studently-price-stack.on')).toBeAttached();
  const selected = await geometry();
  expect(Math.abs(selected.bottom - before.bottom)).toBeLessThan(0.2);
  expect(Math.abs(selected.center - before.center)).toBeLessThan(0.2);
  await writeFile(path.join(output, `${info.project.name}-pin-anchor.json`), JSON.stringify({ before, selected }, null, 2));
});

test('responsive widths and reopening resize the same kept-alive map', async ({ page }, info) => {
  await openMap(page);
  const canvas = mapHost(page).locator('.mapboxgl-canvas');
  await canvas.evaluate(node => { node.dataset.keepAliveProbe = 'step2'; });
  const widths = [320, 390, 768, 1023, 1024, 1440];
  const sizes = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    const expectedWidth = width < 1024 ? width : width - (width >= 1280 ? 420 : 380);
    await expect.poll(async () => (await mapState(page))?.canvasWidth).toBe(expectedWidth);
    await expect(page.getByTestId('result-card-room-a')).toHaveCount(width < 1024 ? 0 : 1);
    await expect(canvas).toHaveAttribute('data-keep-alive-probe', 'step2');
    sizes.push({ width, canvasWidth: (await mapState(page)).canvasWidth });
  }
  await page.getByRole('button', { name: 'Close map', exact: true }).click();
  await expect(page.getByTestId('result-card-room-a')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Explore on map/i }).click();
  await expect.poll(async () => (await mapState(page))?.canvasWidth).toBe(390);
  await expect(canvas).toHaveAttribute('data-keep-alive-probe', 'step2');
  await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-responsive.json`), JSON.stringify({ sizes, keptAliveAcrossCloseAndReopen: true }, null, 2));
});

test('selected pin and route survive popup-to-card breakpoint changes', async ({ page }, info) => {
  await openMarkerMap(page, '?universitySlugs=aub');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), info.project.name === 'mobile-web');
  await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(1);
  for (const width of [390, 1440, 768, 1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByTestId('mobile-map-selection')).toHaveCount(width < 1024 ? 1 : 0);
    await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(width < 1024 ? 0 : 1);
    await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(1);
    await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  }
  await page.getByTestId('mobile-map-selection').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  await expect(mapHost(page).locator('.studently-price-stack.on')).toHaveCount(0);
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveCount(0);
});

async function touchDrag(page, start, finish) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: start });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: start.map((point, index) => ({
      ...point, x: point.x + (finish[index].x - point.x) * step / 8, y: point.y + (finish[index].y - point.y) * step / 8,
    })) });
    await page.waitForTimeout(25);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

test('pin replacement, drag and pinch retention, blank tap and Escape dismissal', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMarkerMap(page);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  if (mobile) {
    const box = await page.getByTestId('mobile-map-selection').boundingBox();
    const logo = await mapHost(page).getByRole('link', { name: 'Mapbox homepage' }).boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(logo.y);
    const center = (await mapState(page)).center;
    await touchDrag(page, [{ x: 40, y: 300, id: 0 }], [{ x: 130, y: 300, id: 0 }]);
    await expect.poll(async () => (await mapState(page)).center[0]).not.toBe(center[0]);
    await expect(page.getByTestId('mobile-map-selection')).toBeVisible();
    expect((await page.getByTestId('mobile-map-selection').boundingBox()).y).toBeCloseTo(box.y, 0);
    await expect.poll(async () => (await mapState(page)).moving).toBe(false);
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 16 });
    const zoom = (await mapState(page)).zoom;
    await touchDrag(page, [{ x: 120, y: 300, id: 0 }, { x: 180, y: 300, id: 1 }], [{ x: 70, y: 300, id: 0 }, { x: 230, y: 300, id: 1 }]);
    await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(zoom);
    await expect(page.getByTestId('mobile-map-selection')).toBeVisible();
  } else {
    await mapState(page, 'pan');
    await expect(mapHost(page).locator('.studently-amber-popup-group')).toBeVisible();
  }
  await mapState(page, 'jump', { center: [35.4801, 33.8991], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$420' }), mobile);
  const surface = cardHost(page, mobile);
  await expect(surface.locator('.studently-popup-title')).toHaveText('Baseline nearby');
  await expect(surface.locator('.studently-popup-body-link')).toHaveAttribute('href', '/listing/nearby');
  await expect(surface.locator('.studently-popup-body-link')).toHaveAttribute('target', '_blank');
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(mobile ? 0 : 1);
  await page.screenshot({ path: path.join(output, `${info.project.name}-single-selection.png`) });
  await page.waitForTimeout(300);
  if (mobile) await page.touchscreen.tap(40, 220);
  else await mapHost(page).locator('.mapboxgl-canvas').click({ position: { x: 40, y: 80 } });
  await expect(surface.locator('.studently-popup-title')).toHaveCount(0);
  if (mobile) {
    await mapState(page, 'jump', { center: [35.4801, 33.8991], zoom: 18 });
    const marker = mapHost(page).locator('.studently-marker-el').filter({ has: page.locator('.studently-price-pill', { hasText: '$420' }) });
    await marker.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('mobile-map-selection')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  }
});

test('large place groups scroll in the card without moving the map', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  fixtureState.get(page).many = true;
  await openMarkerMap(page);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 20' }), mobile);
  await expect(cardHost(page, mobile).locator('.studently-popup-group-item')).toHaveCount(20);
  if (mobile) {
    await expect.poll(async () => (await mapState(page)).moving).toBe(false);
    const content = page.locator('.studently-mobile-map-card-content');
    const close = page.getByTestId('mobile-map-selection').getByRole('button', { name: 'Close', exact: true });
    const closeBox = await close.boundingBox();
    expect(closeBox.width).toBeGreaterThanOrEqual(44);
    expect(closeBox.height).toBeGreaterThanOrEqual(44);
    const box = await content.boundingBox();
    const before = await mapState(page);
    await touchDrag(page, [{ x: box.x + box.width / 2, y: box.y + box.height - 15, id: 0 }], [{ x: box.x + box.width / 2, y: box.y + 10, id: 0 }]);
    await expect.poll(() => content.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    expect((await mapState(page)).center).toEqual(before.center);
    expect((await mapState(page)).zoom).toBe(before.zoom);
    await expect(close).toBeVisible();
    // Finish the native scroll fling before beginning an independent tap.
    let lastScroll = -1;
    await expect.poll(async () => {
      const top = await content.evaluate(node => node.scrollTop);
      const settled = Math.abs(top - lastScroll) < 0.5;
      lastScroll = top;
      return settled;
    }).toBe(true);
    await page.screenshot({ path: path.join(output, 'mobile-scrollable-group.png') });
    await close.tap();
    await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  } else {
    await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(1);
    await mapHost(page).getByRole('button', { name: 'Close', exact: true }).click();
  }
});

async function clickMapPoint(page, coordinates, mobile, yOffset = 0) {
  // Project a painted frame, not a just-updated camera awaiting placement.
  await settleMapCapture(page);
  const state = await mapState(page, 'read', { coordinates });
  const position = { x: state.projected.x, y: state.projected.y + yOffset };
  const canvas = mapHost(page).locator('.mapboxgl-canvas');
  if (mobile) await canvas.tap({ position });
  else await canvas.click({ position });
}

async function settleMapCapture(page) {
  // Give jumpTo a rendered frame to request the new zoom's tiles, then wait for
  // tiles, placement and pending style changes (not just our pin source).
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(async () => {
    const state = await mapState(page);
    return state.loaded && state.tilesLoaded && !state.moving;
  }, { timeout: 45_000 }).toBe(true);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('GL places and cluster counts render without ordinary HTML pins and expand on click', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMap(page, '?mapPins=layers');
  await expect.poll(async () => (await mapState(page)).layerData?.features?.length).toBe(3);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
  const first = await mapState(page);
  const shared = first.layerData.features.find(feature => feature.id === 'place:shared');
  expect(shared.properties.price).toBe(300);
  expect(shared.properties.memberCount).toBe(2);
  expect(shared.properties.label).toBe('$300 · 2');
  await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
  await expect(mapHost(page).locator('.studently-cluster-bubble')).toHaveCount(0);
  await mapState(page, 'observeLayerData');
  await mapState(page, 'pan');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await expect.poll(async () => (await mapState(page)).layerClusters.some(cluster => cluster.point_count === 2)).toBe(true);
  await expect.poll(async () => (await mapState(page)).layerImages.includes('studently-cluster-count:2')).toBe(true);
  const cluster = (await mapState(page)).layerClusters.find(cluster => cluster.point_count === 2);
  await clickMapPoint(page, cluster.coordinates, mobile);
  await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(16);
  expect((await mapState(page)).layerWrites).toBe(0);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
  await expect.poll(async () => (await mapState(page)).activePins.map(pin => pin.groupId)).toEqual(['place:shared']);
  expect((await mapState(page, 'read', { groupId: 'place:shared' })).featureState.active).toBe(true);
  expect((await mapState(page)).layerWrites).toBe(0);
  expect((await mapState(page)).activeWrites).toBe(0);
  // The popup must leave the selected price label clickable on the canvas.
  if (mobile) await mapState(page, 'observeTapInput');
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  if (mobile) await writeFile(path.join(output, `${info.project.name}-tap-input.json`), JSON.stringify(await mapState(page), null, 2));
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  if (mobile) {
    await settleMapCapture(page);
    await page.waitForTimeout(550);
    const state = await mapState(page, 'read', { coordinates: [35.48, 33.899] });
    const box = await mapHost(page).locator('.mapboxgl-canvas').boundingBox();
    const x = box.x + state.projected.x;
    const y = box.y + state.projected.y - 54;
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
    await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(state.zoom);
    await expect(page.getByTestId('mobile-map-selection')).toBeVisible();
  }
  await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
  await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
  expect((await mapState(page)).layerErrors).toEqual([]);
  // Mapbox's TapRecognizer uses a 500ms window. This is an independent reopen,
  // not the second half of the previous canvas tap's double-tap zoom gesture.
  if (mobile) await page.waitForTimeout(550);
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  if (mobile) await writeFile(path.join(output, `${info.project.name}-reopen-tap-input.json`), JSON.stringify(await mapState(page), null, 2));
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await activate(page.getByLabel('Room type', { exact: true }), mobile);
  await activate(page.getByRole('button', { name: 'Studio', exact: true }), mobile);
  await expect(page.getByText('No pins on the map', { exact: true })).toBeVisible();
  await expect.poll(async () => (await mapState(page)).activeData.features.length).toBe(0);
  await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(0);
  await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-layers-basic.json`), JSON.stringify({ initial: first, final: await mapState(page) }, null, 2));
});

test('GL source stays stable on reordered polling and restores images/data after a style reload', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await page.clock.install();
  let requests = 0;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/listings' && url.searchParams.get('view') === 'map') requests++;
  });
  await openMap(page, '?mapPins=layers&universitySlugs=aub');
  await expect.poll(async () => (await mapState(page)).layerData?.features?.length).toBe(3);
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  await mapState(page, 'observeLayerData');
  const before = await mapState(page);
  const requestCount = requests;
  fixtureState.get(page).reversed = true;
  fixtureState.get(page).promotionRevision++;
  await page.clock.fastForward(61_000);
  await expect.poll(() => requests).toBeGreaterThan(requestCount);
  await page.clock.fastForward(1_000);
  expect((await mapState(page)).layerWrites).toBe(0);
  expect((await mapState(page)).center).toEqual(before.center);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  fixtureState.get(page).priceDelta = 25;
  fixtureState.get(page).eastShift = 0.001;
  fixtureState.get(page).sharedShift = 0.0002;
  await page.clock.fastForward(61_000);
  await expect.poll(async () => (await mapState(page)).layerData.features.find(feature => feature.id === 'place:shared').properties.price).toBe(325);
  const edited = await mapState(page);
  expect(edited.layerWrites).toBe(1);
  expect(edited.activeWrites).toBe(1);
  expect(edited.activeData).toEqual(edited.layerData);
  expect(edited.activeData.features.find(feature => feature.id === 'place:shared').geometry.coordinates[0]).toBeCloseTo(35.4802, 6);
  if (!mobile) expect(await page.evaluate(() => window._studentlyActivePopup.getLngLat().lng)).toBeCloseTo(35.4802, 6);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  expect(edited.center).toEqual(before.center);
  expect(edited.layerData.features.find(feature => feature.id === 'place:east').geometry.coordinates[0]).toBeCloseTo(35.541, 6);
  const repairedImage = edited.layerData.features.find(feature => feature.id === 'place:nearby').properties.image;
  await mapState(page, 'removePinImage', { groupId: 'place:nearby' });
  await expect.poll(async () => (await mapState(page)).layerImages.includes(repairedImage)).toBe(true);
  await mapState(page, 'reloadStyle');
  await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
  await expect.poll(async () => (await mapState(page)).layerImages.length).toBeGreaterThanOrEqual(3);
  const restored = await mapState(page, 'read', { groupId: 'place:shared' });
  expect(restored.featureState.active).toBe(true);
  expect(restored.activeFeatureState.active).toBe(true);
  expect(restored.activeData).toEqual(edited.activeData);
  expect(restored.layerData).toEqual(edited.layerData);
  expect(restored.layers.indexOf('studently-campus-line-layer')).toBeLessThan(restored.layers.indexOf('studently-listing-pins'));
  await expect(mapHost(page).locator('.studently-campus-stack')).toHaveCount(2);
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  expect(restored.layerErrors).toEqual([]);
  await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
  await expect.poll(async () => (await mapState(page)).activePins.length).toBe(0);
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-layers-refresh.json`), JSON.stringify({ before, edited, restored }, null, 2));
});

test('GL highlight stays above clusters without HTML pins or source rewrites', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMap(page, '?mapPins=layers');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
  await mapState(page, 'observeLayerData');
  if (!mobile) {
    await page.getByTestId('result-card-nearby').hover();
    await expect.poll(async () => (await mapState(page)).activePins.map(pin => pin.groupId)).toEqual(['place:nearby']);
    await page.mouse.move(5, 5);
    await expect.poll(async () => (await mapState(page)).activePins.length).toBe(0);
    await expect.poll(async () => (await mapState(page)).moving).toBe(false);
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
  }
  await clickMapPoint(page, [35.48, 33.899], mobile, -54);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await expect.poll(async () => (await mapState(page)).layerClusters.length).toBeGreaterThan(0);
  await expect.poll(async () => (await mapState(page)).activePins.map(pin => pin.groupId)).toEqual(['place:shared']);
  const clustered = await mapState(page, 'read', { groupId: 'place:shared' });
  expect(clustered.activeFeatureState.active).toBe(true);
  expect(clustered.layers.indexOf('studently-active-listing-pin')).toBeGreaterThan(clustered.layers.indexOf('studently-listing-cluster-count'));
  // The active point owns hit testing even when a cluster occupies its anchor.
  await clickMapPoint(page, [35.48, 33.899], mobile);
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.studently-price-stack,.studently-cluster-bubble')).toHaveCount(0);
  expect((await mapState(page)).layerWrites).toBe(0);
  expect((await mapState(page)).activeWrites).toBe(0);
  await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
  await expect.poll(async () => (await mapState(page)).activePins.length).toBe(0);
  await writeFile(path.join(output, `${info.project.name}-layer-highlight.json`), JSON.stringify({ clustered, final: await mapState(page) }, null, 2));
});

test('GL keyboard selection, popup guards, routes, arrows and breakpoint handoff retain selection', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMap(page, '?mapPins=layers&universitySlugs=aub');
  await expect.poll(async () => (await mapState(page)).activeData?.features.length).toBe(3);
  const chooser = page.getByRole('combobox', { name: 'Choose a listing on the map' });
  await chooser.focus();
  await expect.poll(() => chooser.evaluate(node => getComputedStyle(node.parentElement).opacity)).toBe('1');
  await chooser.selectOption('place:shared');
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
  await settleMapCapture(page);
  if (!mobile) {
    const layout = await mapHost(page).locator('.studently-layer-popup .mapboxgl-popup-content').evaluate(content => {
      const box = content.getBoundingClientRect();
      return [...content.querySelectorAll('.studently-popup-group-header,.studently-popup-group-title')].map(node => {
        const text = node.getBoundingClientRect();
        return { text: node.textContent, left: text.left - box.left, right: box.right - text.right };
      });
    });
    expect(layout.every(item => item.left >= 0 && item.right >= 0)).toBe(true);
    await writeFile(path.join(output, `${info.project.name}-popup-text-layout.json`), JSON.stringify(layout, null, 2));
  }
  await page.screenshot({ path: path.join(output, `${info.project.name}-selected-layers.png`) });
  if (!mobile) await page.evaluate(() => { window.__oldLayerPopup = window._studentlyActivePopup; });
  await mapState(page, 'observeLayerData');
  await chooser.selectOption('place:east');
  await expect(cardHost(page, mobile).locator('.studently-popup-title')).toHaveText('Baseline east');
  if (!mobile) await page.evaluate(() => { window.__oldLayerPopup.remove(); window.__oldLayerPopup.fire('close'); });
  await expect(cardHost(page, mobile).locator('.studently-popup-title')).toHaveText('Baseline east');
  const handoffs = [];
  for (const width of mobile ? [1440, 390] : [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => (await mapState(page)).canvasWidth).toBe(width < 1024 ? width : width - 420);
    await expect(mapHost(page).locator('.mapboxgl-popup')).toHaveCount(width < 1024 ? 0 : 1);
    await expect(cardHost(page, width < 1024).locator('.studently-popup-title')).toHaveText('Baseline east');
    await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
    expect((await mapState(page, 'read', { groupId: 'place:east' })).activeFeatureState.active).toBe(true);
    handoffs.push({ width, state: await mapState(page) });
  }
  await activate(page.getByRole('button', { name: /Close map/i }), mobile);
  await activate(page.getByRole('button', { name: /Explore on map/i }), mobile);
  await expect(mapHost(page).locator('.mapboxgl-canvas')).toBeVisible();
  if (mobile) {
    await expect(page.getByTestId('mobile-map-selection')).toHaveCount(0);
    await chooser.selectOption('place:east');
  }
  await expect(cardHost(page, mobile).locator('.studently-popup-title')).toHaveText('Baseline east');
  if (mobile) {
    const beforeDrag = (await mapState(page)).center;
    await touchDrag(page, [{ x: 40, y: 300, id: 0 }], [{ x: 130, y: 300, id: 0 }]);
    await expect.poll(async () => (await mapState(page)).center[0]).not.toBe(beforeDrag[0]);
    await expect(page.getByTestId('mobile-map-selection')).toBeVisible();
  }
  await mapState(page, 'jump', { center: [35.55, 33.89], zoom: 18 });
  await expect(page.getByRole('button', { name: 'Show Baseline east on the map' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show AUB on the map' })).toBeVisible();
  await mapState(page, 'jump', { center: [otherCampus.lng, otherCampus.lat], zoom: 17 });
  await activate(mapHost(page).getByRole('button', { name: 'Switch campus to Other' }), mobile);
  await expect(mapHost(page).getByRole('button', { name: 'Switch to this campus' })).toBeVisible();
  await activate(mapHost(page).getByRole('button', { name: 'Keep current campus' }), mobile);
  await expect(mapHost(page).getByRole('button', { name: 'Switch to this campus' })).toHaveCount(0);
  expect((await mapState(page)).layerWrites).toBe(0);
  expect((await mapState(page)).activeWrites).toBe(0);
  await expect(mapHost(page).locator('.studently-price-stack,.studently-cluster-bubble')).toHaveCount(0);
  await mapState(page, 'jump', { center: [35.54, 33.890], zoom: 18 });
  await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
  await expect.poll(async () => (await mapState(page)).activePins.length).toBe(0);
  await expect(mapHost(page).locator('.studently-dist-badge')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-layer-presentation.json`), JSON.stringify({ handoffs, final: await mapState(page) }, null, 2));
});

test('GL click camera preserves normal-motion timing and selection', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openMap(page, '?mapPins=layers&universitySlugs=aub');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await expect.poll(async () => (await mapState(page)).layerClusters.length).toBeGreaterThan(0);
  await mapState(page, 'observeLayerData');
  await mapState(page, 'observeClickCamera');
  await page.getByRole('combobox', { name: 'Choose a listing on the map' }).selectOption('place:shared');
  await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
  await expect.poll(async () => (await mapState(page)).clickCameras.length).toBe(1);
  const camera = (await mapState(page)).clickCameras[0];
  expect(camera.duration).toBe(mobile ? 350 : 550);
  expect(camera.zoom).toBe(16);
  if (mobile) expect(camera.offset[1]).toBeLessThan(0);
  await expect.poll(async () => (await mapState(page)).moving, { timeout: 10_000 }).toBe(false);
  await expect.poll(async () => (await mapState(page)).activePins.map(pin => pin.groupId)).toEqual(['place:shared']);
  expect((await mapState(page)).layerWrites).toBe(0);
  expect((await mapState(page)).activeWrites).toBe(0);
  await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
  await writeFile(path.join(output, `${info.project.name}-layer-click-camera.json`), JSON.stringify({ camera, final: await mapState(page) }, null, 2));
});

test('GL zoom sweep across cluster boundaries has no render or hit-test errors', async ({ page }, info) => {
  test.setTimeout(180_000);
  const mobile = info.project.name === 'mobile-web';
  fixtureState.get(page).distinct = true;
  const errors = [];
  const captures = [];
  page.on('pageerror', error => errors.push(error.stack ?? String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const capture = Promise.all(message.args().map(arg => arg.evaluate(value => value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack } : String(value))))
      .then(args => errors.push(JSON.stringify(args))).catch(() => errors.push(message.text()));
    captures.push(capture);
  });
  const observations = [];
  try {
    await openMap(page, '?mapPins=layers');
    await expect.poll(async () => (await mapState(page)).layerData?.features?.length).toBe(51);
    await mapState(page, 'observeLayerData');
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
    await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
    await clickMapPoint(page, [35.48, 33.899], mobile, -54);
    await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
    const box = await mapHost(page).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (const zoom of [18, 17, 16.9, 16, 15, 14, 13, 12, 11, 10, 8, 6, 4, 2, 0, 6, 12, 16, 18]) {
      await mapState(page, 'jump', { center: [35.48, 33.899], zoom });
      await expect.poll(async () => (await mapState(page)).sourceLoaded, { timeout: 10_000 }).toBe(true);
      await page.waitForTimeout(150);
      await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
      const state = await mapState(page);
      observations.push({ zoom, clusters: state.layerClusters, pins: state.layerPins.length, layerErrors: state.layerErrors });
      expect(state.layerPins.length + state.layerClusters.length).toBeGreaterThan(0);
    }
    // Wheel zooms exercise intermediate frames and hit testing, unlike jumpTo.
    for (let index = 0; !mobile && index < 12; index++) {
      await page.mouse.wheel(0, 650);
      await page.mouse.move(box.x + box.width / 2 + index, box.y + box.height / 2);
      await page.waitForTimeout(120);
    }
    if (mobile) {
      await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 16 });
      await touchDrag(page, [{ x: 70, y: 300, id: 0 }, { x: 230, y: 300, id: 1 }],
        [{ x: 120, y: 300, id: 0 }, { x: 180, y: 300, id: 1 }]);
      await expect.poll(async () => (await mapState(page)).zoom).toBeLessThan(16);
    }
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
    await expect(cardHost(page, mobile).locator('.studently-amber-popup-group')).toBeVisible();
    expect((await mapState(page, 'read', { groupId: 'place:shared' })).featureState.active).toBe(true);
    await activate(cardHost(page, mobile).getByRole('button', { name: 'Close', exact: true }), mobile);
    await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(0);
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
    await expect.poll(async () => (await mapState(page)).layerClusters.length).toBeGreaterThan(0);
    await expect.poll(async () => {
      const state = await mapState(page);
      return state.layerClusters.every(cluster => state.layerImages.includes(`studently-cluster-count:${cluster.point_count}`));
    }).toBe(true);
    await page.waitForTimeout(500);
    await Promise.all(captures);
    expect(errors.filter(error => /reading ['"]paint|TypeError|ReferenceError/.test(error))).toEqual([]);
    expect((await mapState(page)).layerErrors).toEqual([]);
    expect((await mapState(page)).layerWrites).toBe(0);
    expect((await mapState(page)).activeWrites).toBe(0);
  } finally {
    await Promise.all(captures);
    await writeFile(path.join(output, `${info.project.name}-zoom-sweep.json`), JSON.stringify({ liveStyle, errors, observations, final: await mapState(page) }, null, 2));
  }
});

for (const request of ['markers', 'layers', 'default']) {
  const mode = request === 'default' ? 'layers' : request;
  test(`non-location filters retain the panned camera and visible mounted map while reloading (${request})`, async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-web';
    await openMap(page, request === 'default' ? '' : `?mapPins=${mode}`);
    await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer', mode);
    await expect(mapHost(page)).toHaveAttribute('data-map-pin-renderer-source', request === 'default' ? 'default' : 'url');
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18, bearing: 12, pitch: 20 });
    const box = await mapHost(page).boundingBox();
    if (mobile) await touchDrag(page, [{ x: 50, y: 300, id: 0 }], [{ x: 130, y: 300, id: 0 }]);
    else {
      await page.mouse.move(box.x + box.width / 2, box.y + 300);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 80, box.y + 300, { steps: 12 });
      await page.mouse.up();
      await page.mouse.move(5, 5);
    }
    await expect.poll(async () => (await mapState(page)).moving).toBe(false);
    expect((await mapState(page)).center).not.toEqual([35.48, 33.899]);
    // Legacy viewport culling runs 80ms after moveend. Finish that pan work before
    // recording markers whose lifetime the subsequent filter must preserve.
    if (mode === 'markers') await expect(mapHost(page).locator('.studently-price-pill')).toHaveCount(2);
    await mapState(page, 'observeReload');
    await mapState(page, 'observeClickCamera');
    if (mode === 'layers') await mapState(page, 'observeLayerData');
    const before = await mapState(page);
    const state = fixtureState.get(page);
    let release;
    state.mapGate = new Promise(resolve => { release = resolve; });
    let pending, coveringLoader, indicatorPointerEvents;
    try {
      await activate(page.getByLabel('Room type', { exact: true }), mobile);
      await activate(page.getByRole('button', { name: 'Student Building (PBSA)', exact: true }), mobile);
      await expect.poll(() => state.mapRequestPending).toBe(true);
      // Hold the new map response long enough to observe the transient query gap.
      await page.waitForTimeout(400);
      pending = await mapState(page);
      const indicator = page.getByRole('progressbar', { name: 'Updating map…', exact: true }).first();
      coveringLoader = await indicator.count() ? await indicator.boundingBox() : null;
      indicatorPointerEvents = await indicator.count() ? await indicator.evaluate(node => getComputedStyle(node).pointerEvents) : null;
      await page.screenshot({ path: path.join(output, `${info.project.name}-${request}-filter-pending.png`) });
    } finally { state.mapGate = null; release(); }
    await expect.poll(async () => Object.keys((await mapState(page)).mapPrices)).toEqual(['east']);
    await page.waitForTimeout(900);
    const after = await mapState(page);
    await writeFile(path.join(output, `${info.project.name}-${request}-filter-reload.json`), JSON.stringify({ before, pending, coveringLoader, indicatorPointerEvents, after }, null, 2));
    expect.soft(pending.mapPrices).toEqual(before.mapPrices);
    expect.soft(pending.reloadProbe).toEqual({ sameMap: true, sameCanvas: true, oldMarkersConnected: true });
    if (mode === 'layers') {
      expect.soft(pending.layerData).toEqual(before.layerData);
      expect.soft(pending.layerWrites).toBe(0);
    }
    expect.soft((coveringLoader?.width ?? 0) * (coveringLoader?.height ?? 0)).toBeLessThan(box.width * box.height * 0.15);
    expect.soft(indicatorPointerEvents).toBe('none');
    expect.soft(pending.center).toEqual(before.center);
    expect.soft(pending.zoom).toBe(before.zoom);
    expect.soft(after.reloadProbe.sameMap).toBe(true);
    expect.soft(after.reloadProbe.sameCanvas).toBe(true);
    expect.soft(after.clickCameras).toEqual([]);
    expect.soft(after.center).toEqual(before.center);
    expect.soft(after.zoom).toBe(before.zoom);
    expect.soft(after.pitch).toBe(before.pitch);
    expect.soft(after.bearing).toBe(before.bearing);
    if (mode === 'layers') expect.soft(after.layerWrites).toBe(1);
    // An actual geographic filter remains an eligible fit even with the same IDs.
    await activate(page.getByLabel('Area', { exact: true }), mobile);
    await activate(page.getByRole('button', { name: 'Hamra', exact: true }), mobile);
    await expect.poll(async () => (await mapState(page)).clickCameras.filter(call => call.kind === 'fit').length).toBeGreaterThan(0);
  });
}

for (const mode of ['markers', 'layers']) {
  test(`preview camera follows bounds rather than price or response order (${mode})`, async ({ page }, info) => {
    await page.clock.install();
    await page.goto(`/search?mapPins=${mode}`);
    await expect(page.getByTestId('result-card-room-a')).toBeVisible({ timeout: 60_000 });
    const selector = '.studently-mapbox-map[aria-hidden]';
    if (info.project.name === 'mobile-web') {
      await expect(page.locator(selector)).toHaveCount(0);
      await page.getByRole('button', { name: /Explore on map/i }).tap();
      await expect.poll(async () => (await mapState(page))?.canvasWidth).toBe(390);
      return;
    }
    const preview = (action = 'read') => mapState(page, action, undefined, selector);
    await expect.poll(async () => (await preview())?.loaded, { timeout: 45_000 }).toBe(true);
    await preview('observePreviewFit');
    if (mode === 'layers') await preview('observeLayerData');
    const before = await preview();
    const state = fixtureState.get(page);
    state.reversed = true; state.promotionRevision++;
    await page.clock.fastForward(61_000);
    await page.clock.fastForward(1_000);
    const reordered = await preview();
    expect(reordered.previewFits).toEqual([]);
    expect(reordered.center).toEqual(before.center);
    if (mode === 'layers') expect(reordered.layerWrites).toBe(0);
    state.priceDelta = 25;
    await page.clock.fastForward(61_000);
    await expect.poll(async () => (await preview()).mapPrices.east).toBe(675);
    expect((await preview()).previewFits).toEqual([]);
    state.many = true;
    await page.clock.fastForward(61_000);
    if (mode === 'layers') await expect.poll(async () => (await preview()).layerData.features.find(feature => feature.id === 'place:shared').properties.memberCount).toBe(20);
    else await expect(page.locator(selector).locator('.studently-price-pill', { hasText: '$325 · 20' })).toHaveCount(1);
    expect((await preview()).previewFits).toEqual([]);
    state.sharedShift = 0.0002;
    await page.clock.fastForward(61_000);
    await expect.poll(async () => (await preview()).previewFits.length).toBe(1);
    await preview('observeClickCamera');
    state.onlyShared = true;
    await page.clock.fastForward(61_000);
    await expect.poll(async () => (await preview()).clickCameras.at(-1)?.center?.[0]).toBeCloseTo(35.4802, 9);
    await expect.poll(async () => (await preview()).clickCameras.at(-1)?.center?.[1]).toBeCloseTo(33.899, 9);
    await expect.poll(async () => (await preview()).loaded).toBe(true);
    // The live style can settle a few meters from the requested geographic
    // center. Verify the ground target actually lands at the canvas center.
    const centered = await mapState(page, 'read', { coordinates: [35.4802, 33.899] }, selector);
    expect(Math.hypot(centered.projected.x - centered.canvasWidth / 2,
      centered.projected.y - centered.canvasHeight / 2)).toBeLessThanOrEqual(3);
    await writeFile(path.join(output, `${info.project.name}-${mode}-preview-camera.json`), JSON.stringify({ before, reordered, final: await preview() }, null, 2));
  });

  test(`price polling cannot replay a completed camera request (${mode})`, async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-web';
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openMap(page, `?mapPins=${mode}&universitySlugs=aub`);
    await mapState(page, 'observeClickCamera');
    if (!mobile) {
      await page.getByTestId('result-card-east').hover();
      await expect.poll(async () => (await mapState(page)).clickCameras.filter(call => call.kind === 'hover').length,
        { timeout: 10_000, intervals: [50] }).toBe(3);
      await expect.poll(async () => (await mapState(page)).moving).toBe(false);
      await expect.poll(async () => (await mapState(page)).center[0]).toBeCloseTo(35.54, 5);
    }
    const before = await mapState(page);
    fixtureState.get(page).priceDelta = 25;
    fixtureState.get(page).promotionRevision++;
    await page.clock.fastForward(61_000);
    await expect.poll(async () => (await mapState(page)).mapPrices.east).toBe(675);
    if (mode === 'layers') await expect.poll(async () => (await mapState(page)).layerData.features.find(feature => feature.id === 'place:east').properties.price).toBe(675);
    await page.clock.fastForward(2_000);
    const after = await mapState(page);
    expect(after.clickCameras.length).toBe(before.clickCameras.length);
    expect(after.center).toEqual(before.center);
    expect(after.zoom).toBe(before.zoom);
    if (mode === 'markers') {
      await mapState(page, 'jump', { center: [35.54, 33.890], zoom: 18 });
      await expect(mapHost(page).locator('.studently-price-pill', { hasText: '$675' })).toHaveCount(1);
    }
    await writeFile(path.join(output, `${info.project.name}-${mode}-camera-price-poll.json`), JSON.stringify({ before, after }, null, 2));
  });

  test(`camera takeover cancels old flight stages and preserves new selection (${mode})`, async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-web';
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openMap(page, `?mapPins=${mode}&universitySlugs=aub`);
    await mapState(page, 'observeClickCamera');
    if (!mobile) {
      await page.getByTestId('result-card-east').hover();
      await expect.poll(async () => (await mapState(page)).clickCameras.length, { timeout: 10_000, intervals: [50] }).toBe(1);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(1_800);
      expect((await mapState(page)).clickCameras.length).toBe(1);
      expect((await mapState(page)).moving).toBe(false);
      await page.getByTestId('result-card-east').hover();
      await expect.poll(async () => (await mapState(page)).clickCameras.length, { timeout: 10_000, intervals: [50] }).toBe(2);
      // DOM activation models the legacy marker's keyboard path even while its
      // hovered point is offscreen. GL uses the keyboard chooser from Step 5.
      if (mode === 'layers') await page.getByRole('combobox', { name: 'Choose a listing on the map' }).selectOption('place:east');
      else await mapHost(page).locator('.studently-price-pill', { hasText: '$650' }).evaluate(node => node.closest('.studently-marker-el').click());
      await page.mouse.move(5, 5);
    } else {
      await mapState(page, 'jump', { center: [otherCampus.lng, otherCampus.lat], zoom: 17 });
      await activate(mapHost(page).getByRole('button', { name: 'Switch campus to Other' }), true);
      await activate(mapHost(page).getByRole('button', { name: 'Switch to this campus' }), true);
      await expect.poll(async () => (await mapState(page)).clickCameras.some(call => call.kind === 'focus'), { timeout: 10_000, intervals: [50] }).toBe(true);
      await touchDrag(page, [{ x: 40, y: 300, id: 0 }], [{ x: 130, y: 300, id: 0 }]);
      await expect.poll(async () => (await mapState(page)).moving).toBe(false);
      const stopped = (await mapState(page)).clickCameras.length;
      await page.waitForTimeout(1_800);
      expect((await mapState(page)).clickCameras.length).toBe(stopped);
      await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
      if (mode === 'layers') await clickMapPoint(page, [35.48, 33.899], true, -54);
      else await activate(mapHost(page).locator('.studently-price-pill', { hasText: '$300 · 2' }), true);
    }
    const surface = cardHost(page, mobile);
    if (mobile) await expect(surface.locator('.studently-amber-popup-group')).toBeVisible();
    else await expect(surface.locator('.studently-popup-title')).toHaveText('Baseline east');
    await expect.poll(async () => (await mapState(page)).moving).toBe(false);
    const selected = await mapState(page);
    await page.waitForTimeout(1_800);
    const final = await mapState(page);
    expect(final.clickCameras.length).toBe(selected.clickCameras.length);
    expect(final.center).toEqual(selected.center);
    expect(final.clickCameras.filter(call => call.kind === 'selection')).toHaveLength(1);
    await expect(mapHost(page).locator('.studently-dist-badge')).toHaveText('750 m');
    await writeFile(path.join(output, `${info.project.name}-${mode}-camera-takeover.json`), JSON.stringify({ selected, final }, null, 2));
  });
}

test('late cluster zoom is canceled by a map gesture; reopening does not replay initial fit', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  await openMap(page, '?mapPins=layers');
  await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 12 });
  await expect.poll(async () => (await mapState(page)).layerClusters.length).toBeGreaterThan(0);
  await mapState(page, 'delayClusterZoom');
  const cluster = (await mapState(page)).layerClusters.find(item => item.point_count === 2);
  await clickMapPoint(page, cluster.coordinates, mobile);
  await expect.poll(async () => (await mapState(page)).clusterReplyPending).toBe(true);
  if (mobile) await touchDrag(page, [{ x: 40, y: 300, id: 0 }], [{ x: 130, y: 300, id: 0 }]);
  else {
    const box = await mapHost(page).boundingBox();
    await page.mouse.move(box.x + 70, box.y + 300); await page.mouse.down();
    await page.mouse.move(box.x + 170, box.y + 300, { steps: 10 }); await page.mouse.up();
  }
  await expect.poll(async () => (await mapState(page)).moving).toBe(false);
  await mapState(page, 'observeClickCamera');
  await mapState(page, 'observeLayerData');
  const before = await mapState(page);
  await mapState(page, 'releaseClusterZoom');
  await page.waitForTimeout(600);
  expect((await mapState(page)).clickCameras).toEqual([]);
  await activate(page.getByRole('button', { name: /Close map/i }), mobile);
  await activate(page.getByRole('button', { name: /Explore on map/i }), mobile);
  await page.mouse.move(5, 5);
  await expect(mapHost(page).locator('.mapboxgl-canvas')).toBeVisible();
  await page.waitForTimeout(600);
  const after = await mapState(page);
  expect(after.clickCameras).toEqual([]);
  expect(after.center[0]).toBeCloseTo(before.center[0], 7);
  expect(after.center[1]).toBeCloseTo(before.center[1], 7);
  expect(after.zoom).toBeCloseTo(before.zoom, 7);
  expect(after.layerWrites).toBe(0); expect(after.activeWrites).toBe(0);
  await writeFile(path.join(output, `${info.project.name}-late-cluster-and-reopen.json`), JSON.stringify({ before, after }, null, 2));
});

test('capture matching marker/layer screenshots on the same camera and results', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-web';
  const shots = {};
  for (const mode of ['markers', 'layers']) {
    await openMap(page, `?mapPins=${mode}`);
    if (!mobile) {
      // Let the existing transient helper intro finish naturally in both modes.
      await expect.poll(() => page.getByRole('button', { name: 'Need help finding a place?', exact: true }).evaluate(node => {
        const bubble = [...node.children].find(child => child.style.position === 'absolute' && child.style.opacity !== '');
        return bubble ? getComputedStyle(bubble).opacity : '0';
      }), { timeout: 10_000 }).toBe('0');
    }
    await mapState(page, 'jump', { center: [35.51, 33.89455], zoom: mobile ? 11.65 : 13.3 });
    if (mode === 'layers') await expect.poll(async () => (await mapState(page)).layerClusters.length).toBeGreaterThan(0);
    else await expect(mapHost(page).locator('.studently-cluster-bubble')).toHaveCount(1);
    await settleMapCapture(page);
    await page.mouse.move(5, 5);
    await page.screenshot({ path: path.join(output, `${info.project.name}-${mode}-overview.png`) });
    await mapHost(page).screenshot({ path: path.join(output, `${info.project.name}-${mode}-overview-map.png`) });
    const overview = await mapState(page);
    await mapState(page, 'jump', { center: [35.48, 33.899], zoom: 18 });
    if (mode === 'layers') await expect.poll(async () => (await mapState(page)).layerPins.length).toBe(2);
    else await expect(mapHost(page).locator('.studently-price-stack')).toHaveCount(2);
    await settleMapCapture(page);
    await page.screenshot({ path: path.join(output, `${info.project.name}-${mode}-detail.png`) });
    await mapHost(page).screenshot({ path: path.join(output, `${info.project.name}-${mode}-detail-map.png`) });
    shots[mode] = { overview, detail: await mapState(page) };
  }
  expect(shots.layers.overview.center).toEqual(shots.markers.overview.center);
  expect(shots.layers.overview.zoom).toBe(shots.markers.overview.zoom);
  expect(shots.layers.detail.center).toEqual(shots.markers.detail.center);
  expect(shots.layers.detail.zoom).toBe(shots.markers.detail.zoom);
  const width = shots.layers.detail.canvasWidth;
  const panels = [];
  for (const view of ['overview', 'detail']) {
    panels.push(`<h2>${view === 'overview' ? 'Clusters and price pin' : 'Grouped price labels'}</h2>`);
    for (const mode of ['markers', 'layers']) {
      const data = await readFile(path.join(output, `${info.project.name}-${mode}-${view}-map.png`));
      panels.push(`<figure><figcaption>${mode === 'markers' ? 'Marker mode' : 'Layer mode'}</figcaption><img alt="${mode} ${view}" src="data:image/png;base64,${data.toString('base64')}"></figure>`);
    }
  }
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Step 4 ${info.project.name}</title><style>
    *{box-sizing:border-box}body{margin:0;color:#121826;background:#fff;font:14px system-ui,sans-serif}
    header{height:52px;padding:12px 16px;font-size:18px;font-weight:700;border-bottom:1px solid #CBD5E1}
    header small{font-size:13px;font-weight:400;margin-left:16px;color:#475569}
    main{display:grid;grid-template-columns:repeat(2,${width}px);width:${width * 2}px}
    h2{grid-column:1/-1;margin:0;padding:8px 16px;background:#F1F5F9;font-size:14px;border-top:1px solid #CBD5E1}
    figure{margin:0;min-width:0}figcaption{height:36px;padding:8px 16px;font-weight:700;border-bottom:1px solid #CBD5E1}
    img{display:block;width:100%;height:auto}
    </style></head><body><header>${mobile ? 'Mobile web' : 'Desktop web'}<small>Same results and camera · ${liveStyle ? 'live Mapbox basemap' : 'controlled basemap'}</small></header><main>${panels.join('')}</main></body></html>`;
  await writeFile(path.join(output, `${info.project.name}-comparison.html`), html);
  await writeFile(path.join(output, `${info.project.name}-comparison.json`), JSON.stringify(shots, null, 2));
  await page.goto('about:blank');
  await page.setViewportSize({ width: width * 2, height: 900 });
  await page.setContent(html);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  await page.screenshot({ path: path.join(output, `${info.project.name}-comparison.png`), fullPage: true });
});
