// Home card hover/focus preview panel: real home page, real cards, real FavoriteButton and
// saved-list mutations. Authentication and decorative surfaces are isolated; API state is in memory.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { chromium, expect } from '@playwright/test';

const frontend = path.resolve(import.meta.dirname, '..');
const id = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// normalizeListing hands ~2/3 of listings a demo rating by id hash. Pick an id that gets none, so
// the single-photo listing renders the "New" badge instead of a rating pill.
const demoHash = value => { let h = 0; for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0; return h; };
const unratedId = (() => { for (let n = 2; ; n += 1) if (demoHash(id(n)) % 3 === 0) return id(n); })();
const photos = (tag, count) => Array.from({ length: count }, (_, i) => ({
  id: `${tag}-${i}`, url: `/uploads/listings/${tag}-${i + 1}.jpg`, sortOrder: i,
}));
const base = {
  posterId: 'owner', status: 'active', availability: 'available',
  listingType: 'private_room', unitType: 'private_room',
  electricity: 'solar', water: 'state_well_24_7', wifiIncluded: true,
  targetAudience: 'anyone', genderRestriction: 'anyone',
  createdAt: '2026-01-01', publishedAt: '2026-01-01', expiresAt: '2099-01-01',
};
const A = id(1), B = unratedId;
const fillers = [3, 4, 5, 6, 7, 8].map(n => ({ ...base, id: id(1000 + n), title: `Filler room ${n}`, area: 'Byblos', monthlyRentUsd: 200 + n * 10,
  photos: photos('f' + n, 2), amenities: ['fridge'] }));
const FEATURED = id(1004);
fillers[1] = { ...fillers[1], promotion: { campaignId: 'c1', type: 'featured', position: 1, marketKey: 'beirut',
  endsAt: '2099-01-01T00:00:00Z', lastBumpedAt: null, token: 'tok', sessionId: 'sess' } };
// Order matters for geometry: the first card sits 32px from the viewport edge (panel is clamped);
// A is third, so its panel is centered on it, like the Amber capture.
const listings = [
  fillers[0],
  { ...base, id: B, title: 'Single photo room', area: 'Achrafieh', monthlyRentUsd: 300,
    photos: photos('b', 1), amenities: [], publishedAt: new Date().toISOString() },
  { ...base, id: A, title: 'Hamra studio near AUB', area: 'Hamra', addressLine: 'Bliss Street', monthlyRentUsd: 450,
    photos: photos('a', 4), amenities: ['ac_all_rooms', 'washer', 'fridge', 'parking'],
    distanceMeters: 350, nearestCampusName: 'AUB', rating: 4.6, reviewCount: 12 },
  ...fillers.slice(1),
];

const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StudentlyHomePage} from './components/web/home/StudentlyHomePage';
import {SaveAuthPrompt} from './features/saved/saveAuthPrompt';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><SaveAuthPrompt/><StudentlyHomePage/></QueryClientProvider>);
`;
const stubs = {
  api: `import axios from 'axios';export const API_BASE_URL=location.origin;export const api=axios.create({baseURL:location.origin,headers:{Authorization:'Bearer test-session'}});`,
  auth: `import {useSyncExternalStore} from 'react';let state={isSignedIn:true,isLoading:false};export const useAuthSession=()=>{const auth=useSyncExternalStore(()=>()=>{},()=>state);return {...auth,hasClerkSession:true,session:{userId:'renter'},user:{email:'renter@example.com'},logout:async()=>{}};};`,
  router: `export const router={push:url=>{(window.navigations??=[]).push(url);}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;export const useLocalSearchParams=()=>({});export const Link=({href,children,...props})=><a {...props} href={href}>{children}</a>;`,
  authModal: `export const StudentlyAuthModal=({visible,title,onClose})=>visible?<div role="dialog" aria-label={title||'Sign in to Studently'}><button onClick={onClose}>Close sign in</button></div>:null;`,
  storage: `export default {getItem:async key=>localStorage.getItem(key),setItem:async(key,value)=>localStorage.setItem(key,value),removeItem:async key=>localStorage.removeItem(key)};`,
  haptics: `export const ImpactFeedbackStyle={Light:'light',Medium:'medium'};export const impactAsync=async()=>{};`,
  navigation: `export const useHostingNavState=()=>({showBecomeAHost:false,showSwitchToHosting:false});export const openCreateListing=()=>{};`,
  universities: `export const useUniversities=()=>({data:[]});`,
  decorations: `export const Ionicons=()=>null;export const MapPin=()=>null;export const StudentlyLogo=()=>null;export const ProductSwitchControl=()=>null;export const DownloadAppButton=()=>null;export const InstitutionLogo=()=>null;export const InsightsMarquee=()=>null;export const BestMatchBadge=()=>null;export const ListingMoreMenu=()=>null;`,
  gradient: `import {View} from 'react-native';export const LinearGradient=({children,style})=><View style={style}>{children}</View>;`,
  search: `export const SearchAutocomplete=()=>null;`,
  carousel: `import {View} from 'react-native';export const ListingCardCarousel=()=> <View style={{height:150}}/>;`,
  pillIcons: `export const LISTING_PILL_ICONS={};export const highlightTagIcon=()=>undefined;`,
  image: `export const Image=()=>null;`,
  safearea: `import {View} from 'react-native';export const useSafeAreaInsets=()=>({top:0,right:0,bottom:0,left:0});export const SafeAreaView=View;`,
  svg: `export const Svg=()=>null;export const Path=()=>null;export default Svg;`,
};
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: frontend },
  absWorkingDir: frontend, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic',
  outfile: path.join(frontend, '.expo/home-card-preview-tests/bundle.js'),
  resolveExtensions: ['.web.tsx', '.tsx', '.web.ts', '.ts', '.web.js', '.js', '.jsx', '.json'],
  define: { 'process.env.NODE_ENV': '"test"', __DEV__: 'true' },
  alias: { 'react-native': 'react-native-web' },
  plugins: [{ name: 'isolated-boundaries', setup(builder) {
    const rules = [
      [/^@\/lib\/api$/, 'api'], [/AuthSessionProvider$/, 'auth'],
      [/^expo-router$/, 'router'], [/StudentlyAuthModal$/, 'authModal'],
      [/^@react-native-async-storage\/async-storage$/, 'storage'],
      [/^expo-haptics$/, 'haptics'], [/useHostingNavState$|useEnsureSession$/, 'navigation'],
      [/useUniversities$/, 'universities'], [/^expo-linear-gradient$/, 'gradient'], [/^expo-image$/, 'image'],
      [/SearchAutocomplete$/, 'search'], [/ListingCardCarousel$/, 'carousel'],
      [/^@\/lib\/listingPillIcons$/, 'pillIcons'],
      [/^react-native-svg/, 'svg'],
      [/^react-native-safe-area-context$/, 'safearea'],
      [/^@expo\/vector-icons$|^lucide-react-native$|StudentlyLogo$|ProductSwitchControl$|DownloadAppButton$|InstitutionLogo$|InsightsMarquee$|BestMatchBadge$|ListingMoreMenu$/, 'decorations'],
    ];
    for (const [filter, name] of rules) builder.onResolve({ filter }, () => ({ path: name, namespace: 'stub' }));
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path: name }) => ({ contents: stubs[name], resolveDir: frontend, loader: 'tsx' }));
  } }],
});

// 1x1 grey PNG; the panel only needs a real, cacheable image response.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO0srL6DwAFfAJ2cBqHXwAAAABJRU5ErkJggg==', 'base64');
const saved = new Set();
const writes = [], imageRequests = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles.find(file => file.path.endsWith('.js')).contents); return; }
  if (url.pathname === '/bundle.css') { res.setHeader('content-type', 'text/css'); res.end(bundle.outputFiles.find(file => file.path.endsWith('.css'))?.contents ?? ''); return; }
  const font = url.pathname.match(/^\/fonts\/(400Regular|500Medium|600SemiBold)$/)?.[1];
  if (font) {
    res.setHeader('content-type', 'font/ttf');
    res.end(await readFile(path.resolve(frontend, 'node_modules/@expo-google-fonts/dm-sans', font, `DMSans_${font}.ttf`))); return;
  }
  if (url.pathname.startsWith('/uploads/')) { imageRequests.push(url.pathname); res.setHeader('content-type', 'image/png'); res.end(png); return; }
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('content-type', 'application/json');
    const reply = data => res.end(JSON.stringify(data));
    if (url.pathname === '/api/search/suggest') { reply({ data: { sections: { topAreas: [], topCampuses: [] }, results: [] } }); return; }
    if (url.pathname === '/api/listings/home-popular') { reply({ data: { areas: [{ name: 'Hamra', count: 1 }], universities: [] } }); return; }
    if (url.pathname === '/api/listings') { reply({ data: listings, featured: [] }); return; }
    if (url.pathname === '/api/saved') { reply({ data: listings.filter(row => saved.has(row.id)) }); return; }
    const match = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
    if (match && ['POST', 'DELETE'].includes(req.method)) {
      writes.push({ method: req.method, id: match[1] });
      if (req.method === 'POST') saved.add(match[1]); else saved.delete(match[1]);
      reply({ data: { listingId: match[1], saved: saved.has(match[1]) } }); return;
    }
    reply({ data: [] }); return;
  }
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}@font-face{font-family:DMSans_400Regular;src:url(/fonts/400Regular)}@font-face{font-family:DMSans_500Medium;src:url(/fonts/500Medium)}@font-face{font-family:DMSans_600SemiBold;src:url(/fonts/600SemiBold)}</style><div id="root"></div><link rel="stylesheet" href="/bundle.css"><script src="/bundle.js"></script>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [];
const checks = Object.assign([], {
  push(...messages) { for (const message of messages) console.log('  ok -', message); return Array.prototype.push.apply(this, messages); },
});

// Page-side instrumentation: timestamps come from one clock, so delays are not skewed by the
// round trip between Node and the page.
const instrument = () => {
  window.__log = [];
  const stamp = (type, extra = {}) => window.__log.push({ type, t: performance.now(), ...extra });
  document.addEventListener('mouseenter', event => {
    if (event.target.matches?.('.home-property-card')) stamp('card-enter');
  }, true);
  document.addEventListener('mouseleave', event => {
    if (event.target.matches?.('.home-property-card')) stamp('card-leave');
    if (event.target.matches?.('[data-home-preview]')) stamp('panel-leave');
  }, true);
  document.addEventListener('focusin', event => {
    if (event.target.matches?.('a.home-property-card__body')) stamp('link-focus');
  }, true);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.matches?.('[data-home-preview]')) stamp('open');
      for (const node of record.removedNodes) if (node.matches?.('[data-home-preview]')) stamp('close');
    }
  }).observe(document, { childList: true, subtree: true });
};

async function openPage({ width = 1440, height = 900, scale, reduced = false, touch = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  if (scale) await context.addInitScript(value => localStorage.setItem('studently.homepageScale', value), String(scale));
  await context.addInitScript(instrument);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    // Aborted third-party requests log network errors, and the shared nav/footer pass `asChild` to the
    // harness's Link stub (pre-existing, outside the card). Any other console error must fail the test.
    if (message.type() === 'error' && !/Failed to load resource|net::ERR|asChild/.test(message.text())) errors.push(message.text());
  });
  await page.route('https://**/*', route => route.abort());
  await page.goto(origin);
  await expect(page.getByTestId('home-listing-' + A)).toBeVisible();
  await page.evaluate(async () => {
    await Promise.all(['400 13px DMSans_400Regular', '500 13px DMSans_500Medium', '600 16px DMSans_600SemiBold'].map(font => document.fonts.load(font)));
    await document.fonts.ready;
  });
  return page;
}
const wrapper = (page, listing = A) => page.getByTestId('home-listing-' + listing);
const panelOf = page => page.locator('[data-home-preview]');
const logOf = page => page.evaluate(() => window.__log);
const last = (log, type) => log.filter(entry => entry.type === type).at(-1);

async function settle(page, listing = A) {
  const card = wrapper(page, listing);
  await card.scrollIntoViewIfNeeded();
  await card.evaluate(async node => {
    // Scrolling starts the entrance animation on the next observer frame.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(node.getAnimations({ subtree: true })
      .filter(animation => Number.isFinite(animation.effect.getComputedTiming().endTime))
      .map(animation => animation.finished.catch(() => {})));
  });
}
async function cardCenter(page, listing = A) {
  const box = await wrapper(page, listing).locator('.home-property-card').boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.55, box };
}
async function hover(page, listing = A) {
  await settle(page, listing);
  const { x, y } = await cardCenter(page, listing);
  await page.mouse.move(x, y);
}
async function openByHover(page, listing = A) {
  await page.mouse.move(2, 2);
  await hover(page, listing);
  await expect(panelOf(page)).toHaveCount(1);
  await panelOf(page).evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
}
async function closeAll(page) {
  await page.mouse.move(2, 2);
  await expect(panelOf(page)).toHaveCount(0);
}
async function focusLink(page, listing = A, { walk = false } = {}) {
  await page.mouse.move(2, 2);
  await page.evaluate(() => document.activeElement?.blur());
  await settle(page, listing);
  const link = wrapper(page, listing).locator('a.home-property-card__body');
  if (walk) {
    // Real Tab walk from the top of a fresh page.
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab');
      if (await link.evaluate(node => node === document.activeElement)) break;
    }
  } else {
    // Script focus after a key press keeps keyboard modality, so :focus-visible matches.
    await page.keyboard.press('Shift');
    await link.focus();
  }
  assert.equal(await link.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), true, 'card link has keyboard focus');
  return link;
}
const activeInfo = page => page.evaluate(() => {
  const el = document.activeElement;
  return { label: el?.getAttribute('aria-label'), inPanel: !!el?.closest('[data-home-preview]'), tag: el?.tagName,
    card: el?.closest('[data-testid^="home-listing-"]')?.getAttribute('data-testid') ?? null };
});

try {
  // ---- 1. open delay, content, no layout shift, 1440 ------------------------------------------
  let page = await openPage();
  await page.mouse.move(2, 2);
  await settle(page);
  await page.evaluate(() => Promise.race([
    new Promise(resolve => setTimeout(resolve, 3000)),
    Promise.all(document.getAnimations()
      .filter(animation => Number.isFinite(animation.effect.getComputedTiming().endTime))
      .map(animation => animation.finished.catch(() => {}))),
  ]));
  const restingRects = await page.locator('.home-property-card').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100);
  }));
  const restingScroll = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  assert.equal(await wrapper(page).locator('li').count(), 0, 'card at rest stays chip-free');
  assert.equal(await panelOf(page).count(), 0);
  await hover(page);
  await expect(panelOf(page)).toHaveCount(1);
  let log = await logOf(page);
  const openDelay = last(log, 'open').t - last(log, 'card-enter').t;
  assert.ok(openDelay >= 540 && openDelay <= 700, `panel opens ~550ms after entering (got ${openDelay.toFixed(0)}ms)`);
  checks.push(`opens ${openDelay.toFixed(0)}ms after the pointer enters (not before 540ms)`);

  const panel = panelOf(page);
  await panel.evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
  const content = await panel.evaluate(node => ({
    width: node.getBoundingClientRect().width,
    title: node.querySelector('.home-property-preview__name')?.textContent,
    location: node.querySelector('.home-property-preview__location')?.textContent,
    walk: node.querySelector('.home-property-preview__walk')?.textContent,
    chips: [...node.querySelectorAll('.home-property-preview__chips li')].map(li => li.textContent),
    price: node.querySelector('.home-property-preview__price')?.textContent,
    rating: node.querySelector('.home-property-card__badge--rating')?.textContent,
    segments: node.querySelectorAll('.home-property-preview__segment').length,
    arrows: node.querySelectorAll('.home-property-preview__nav').length,
    heart: !!node.querySelector('.studently-favorite-pulse'),
    z: getComputedStyle(node).zIndex, position: getComputedStyle(node).position,
    parent: node.parentElement?.tagName,
  }));
  assert.equal(content.width, 340);
  assert.equal(content.title, 'Hamra studio near AUB');
  assert.equal(content.location, 'Bliss Street, Hamra');
  // The campus name comes from the university list (stubbed empty here), so "campus" is the fallback.
  assert.match(content.walk, /^350m from .+ • ~4 min walk$/);
  assert.deepEqual(content.chips, ['AC in all rooms', 'Washing machine', 'Refrigerator'], 'up to three amenity chips');
  assert.match(content.price, /\$450/);
  assert.equal(content.rating, '4.6/5');
  assert.equal(content.segments, 4); assert.equal(content.arrows, 2); assert.ok(content.heart);
  assert.deepEqual([content.position, content.z, content.parent], ['fixed', '1000', 'BODY']);
  const afterRects = await page.locator('.home-property-card').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100);
  }));
  assert.deepEqual(afterRects, restingRects, 'opening the panel must not move any card');
  assert.deepEqual(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), restingScroll);
  checks.push('panel content: title, address, walk line, 3 chips, price, rating, 4 segments, arrows, heart; 340px wide; no layout shift');

  // The card's heart is just the heart plus a shadow (no backing circle); the panel heart keeps its circle.
  const backing = (scope, selector) => scope.locator(selector).evaluate(node => {
    const style = getComputedStyle(node.querySelector('button'), '::before');
    return { content: style.content, background: style.backgroundColor };
  });
  assert.equal((await backing(wrapper(page), '.home-property-card__favorite')).content, 'none', 'card heart has no circle');
  assert.equal((await backing(panel, '.home-property-preview__heart')).content, '""', 'panel heart keeps its circle');
  const cardHeartLook = await wrapper(page).locator('.home-property-card__favorite .studently-favorite-pulse__surface').evaluate(node => ({
    filter: getComputedStyle(node).filter,
    stroke: getComputedStyle(node.querySelector('svg')).color,
  }));
  assert.match(cardHeartLook.filter, /drop-shadow/, 'card heart has a shadow');
  assert.equal(cardHeartLook.stroke, 'rgb(255, 255, 255)');
  checks.push('card heart at rest: no backing circle, white heart with a drop shadow; panel heart unchanged');

  // The panel heart sits in the middle of its white circle (the circle is centred in the button).
  const heartOffset = await panel.locator('.home-property-preview__heart').evaluate(node => {
    const button = node.querySelector('button').getBoundingClientRect();
    const heart = node.querySelector('.studently-favorite-pulse__glyph:first-child path').getBoundingClientRect();
    return {
      dx: (heart.x + heart.width / 2) - (button.x + button.width / 2),
      dy: (heart.y + heart.height / 2) - (button.y + button.height / 2),
    };
  });
  assert.ok(Math.abs(heartOffset.dx) <= 0.75 && Math.abs(heartOffset.dy) <= 0.75, 'panel heart is centred in its circle: ' + JSON.stringify(heartOffset));
  checks.push('panel heart is centred in its white circle');

  // Rating pill is the card's pill, not a lookalike.
  const pill = el => ({ ...Object.fromEntries(['backgroundColor', 'boxShadow', 'borderRadius', 'color', 'fontSize', 'fontWeight']
    .map(key => [key, getComputedStyle(el)[key]])) });
  const cardPill = await wrapper(page).locator('.home-property-card__badge--rating').evaluate(pill);
  const panelPill = await panel.locator('.home-property-card__badge--rating').evaluate(pill);
  assert.deepEqual(panelPill, cardPill, 'rating pill looks the same in the panel and on the card');
  checks.push('rating pill computes to the same style on the card and in the panel');

  // ---- 2. close on leave: grace period, panel keeps itself open ---------------------------------
  const box = await panel.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30);
  await page.waitForTimeout(400);
  await expect(panel).toHaveCount(1);
  await page.mouse.move(2, 2);
  await expect(panel).toHaveCount(0);
  log = await logOf(page);
  const closeDelay = last(log, 'close').t - last(log, 'panel-leave').t;
  assert.ok(closeDelay >= 135 && closeDelay <= 320, `panel closes ~140ms after leaving (got ${closeDelay.toFixed(0)}ms)`);
  checks.push(`stays open while the pointer is on the panel; closes ${closeDelay.toFixed(0)}ms after leaving`);

  // Leaving before the delay never opens it.
  await hover(page);
  await page.waitForTimeout(250);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  assert.equal(await panelOf(page).count(), 0);
  checks.push('leaving the card before the open delay cancels the open');

  // ---- 3. close on scroll / resize / Escape -------------------------------------------------------
  await openByHover(page);
  const where = await panelOf(page).boundingBox();
  await page.mouse.move(where.x + where.width / 2, where.y + where.height / 2);
  const pageScrollTop = () => page.evaluate(() => [...document.querySelectorAll('*')]
    .find(el => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1 && el.contains(document.querySelector('.home-property-rail')))?.scrollTop ?? -1);
  const topBefore = await pageScrollTop();
  await page.mouse.wheel(0, 240);
  await expect(panelOf(page)).toHaveCount(0, { timeout: 400 });
  await expect.poll(pageScrollTop).toBeGreaterThan(topBefore);
  checks.push('wheel over the panel closes it immediately and the page still scrolls (portal does not swallow the wheel)');
  await page.evaluate(() => [...document.querySelectorAll('*')].find(el => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)?.scrollTo(0, 0));

  await page.mouse.move(2, 2);
  await page.evaluate(() => document.querySelector('.home-property-rail__track')?.scrollTo(0, 0));
  await openByHover(page);
  await page.evaluate(() => document.querySelector('.home-property-rail__track').scrollBy(30, 0));
  await expect(panelOf(page)).toHaveCount(0, { timeout: 400 });
  checks.push('scrolling the rail closes it immediately');

  await page.mouse.move(2, 2);
  await page.evaluate(() => document.querySelector('.home-property-rail__track')?.scrollTo(0, 0));
  await openByHover(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await expect(panelOf(page)).toHaveCount(0, { timeout: 400 });
  await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('resizing the window closes it');

  await page.mouse.move(2, 2);
  await openByHover(page);
  await page.keyboard.press('Escape');
  await expect(panelOf(page)).toHaveCount(0, { timeout: 300 });
  await page.waitForTimeout(700);
  assert.equal(await panelOf(page).count(), 0, 'Escape must not reopen while the pointer is still on the card');
  checks.push('Escape closes it and it does not reopen under a stationary pointer');

  // ---- 4. heart interactions suppress opening ---------------------------------------------------
  await page.mouse.move(2, 2);
  await settle(page);
  const heartBox = await wrapper(page).locator('.home-property-card__favorite button').boundingBox();
  await page.mouse.move(heartBox.x + heartBox.width / 2, heartBox.y + heartBox.height / 2);
  await page.waitForTimeout(900);
  assert.equal(await panelOf(page).count(), 0, 'hovering the card heart must not open the panel');
  await page.mouse.click(heartBox.x + heartBox.width / 2, heartBox.y + heartBox.height / 2);
  const { x: cx, y: cy } = await cardCenter(page);
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(900);
  assert.equal(await panelOf(page).count(), 0, 'after using the card heart the panel stays closed until the card is re-entered');
  await expect(wrapper(page).getByRole('button', { name: 'Remove from saved', exact: true })).toBeVisible();
  await page.mouse.click(heartBox.x + heartBox.width / 2, heartBox.y + heartBox.height / 2); // unsave again
  await expect(wrapper(page).getByRole('button', { name: 'Save listing', exact: true })).toBeVisible();
  await expect.poll(() => writes.length).toBe(2);
  checks.push('hovering or clicking the card heart does not open the panel');

  // ---- 5. shared favorite state, with our pulse ----------------------------------------------
  await page.mouse.move(2, 2);
  await openByHover(page);
  await page.evaluate(() => {
    window.__pulses = [];
    const seen = new MutationObserver(records => {
      for (const record of records) {
        const el = record.target;
        if (record.attributeName === 'data-running' && el.hasAttribute('data-running')) {
          window.__pulses.push(el.closest('[data-home-preview]') ? 'panel' : 'card');
        }
      }
    });
    document.querySelectorAll('.studently-favorite-pulse').forEach(el => seen.observe(el, { attributes: true }));
  });
  let panelHeart = panelOf(page).locator('.studently-favorite-pulse');
  let cardHeart = wrapper(page).locator('.studently-favorite-pulse');
  await expect(panelHeart).toHaveAttribute('aria-pressed', 'false');
  await panelHeart.click();
  await expect(cardHeart).toHaveAttribute('aria-pressed', 'true');
  await expect(panelHeart).toHaveAttribute('aria-pressed', 'true');
  await expect(panelOf(page)).toHaveCount(1);
  await expect.poll(() => writes.length).toBe(3);
  assert.deepEqual(writes.at(-1), { method: 'POST', id: A });
  assert.deepEqual((await page.evaluate(() => window.navigations ?? [])), [], 'heart must not open the listing');
  assert.deepEqual([...new Set(await page.evaluate(() => window.__pulses))].sort(), ['card', 'panel'], 'both hearts pulse');
  await expect.poll(() => panelHeart.getAttribute('data-running')).toBe(null);
  // Toggle from the card heart while the panel is open: the panel follows.
  await cardHeart.evaluate(node => node.click());
  await expect(panelHeart).toHaveAttribute('aria-pressed', 'false');
  await expect(cardHeart).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => writes.length).toBe(4);
  assert.deepEqual(writes.at(-1), { method: 'DELETE', id: A });
  checks.push('panel heart and card heart share state in both directions, both pulse, one write each, no navigation');

  // ---- 6. click opens the listing --------------------------------------------------------------
  const shotBox = await panelOf(page).boundingBox();
  await page.mouse.move(shotBox.x + shotBox.width / 2, shotBox.y + shotBox.height - 25);
  await page.mouse.down(); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.navigations?.length ?? 0)).toBe(1);
  assert.equal((await page.evaluate(() => window.navigations))[0], '/(renter)/listing/' + A);
  await expect(panelOf(page)).toHaveCount(0);
  await openByHover(page);
  const mediaBox = await panelOf(page).locator('.home-property-preview__media').boundingBox();
  await page.mouse.click(mediaBox.x + mediaBox.width / 2, mediaBox.y + mediaBox.height / 2);
  await expect.poll(() => page.evaluate(() => window.navigations?.length ?? 0)).toBe(2);
  assert.equal((await page.evaluate(() => window.navigations))[1], '/(renter)/listing/' + A);
  await page.evaluate(() => { window.navigations = []; });
  checks.push('clicking the panel body or photo opens the listing like the card, and closes the panel');

  // ---- 7. photos: next-only preload, auto-advance, arrows ----------------------------------------
  // Fresh page: Chromium's memory cache would otherwise hide repeat image requests.
  await page.context().close();
  page = await openPage();
  imageRequests.length = 0;
  await openByHover(page);
  await page.waitForTimeout(150);
  const aRequests = () => [...new Set(imageRequests.filter(url => url.includes('/a-')))].sort();
  assert.deepEqual(aRequests(), ['/uploads/listings/a-1.jpg', '/uploads/listings/a-2.jpg'], 'only the first and the next photo load on open');
  const current = () => panelOf(page).locator('.home-property-preview__slide').evaluateAll(nodes => nodes.findIndex(node => node.hasAttribute('data-on')));
  assert.equal(await current(), 0);
  await expect.poll(current, { timeout: 2600 }).toBe(1);
  await expect.poll(() => aRequests().length).toBe(3);
  assert.equal(aRequests().includes('/uploads/listings/a-4.jpg'), false, 'photo 4 is not requested before it is next');
  const states = () => panelOf(page).locator('.home-property-preview__fill').evaluateAll(nodes => nodes.map(node => node.dataset.state));
  assert.deepEqual(await states(), ['done', 'now', 'todo', 'todo']);
  // Manual change resets the dwell timer.
  await panelOf(page).getByRole('button', { name: 'Next photo' }).click();
  assert.equal(await current(), 2);
  await page.waitForTimeout(1200);
  assert.equal(await current(), 2, 'a manual change restarts the 1800ms timer');
  await panelOf(page).getByRole('button', { name: 'Previous photo' }).click();
  assert.equal(await current(), 1);
  assert.deepEqual((await page.evaluate(() => window.navigations ?? [])), [], 'arrows must not open the listing');
  checks.push('only current+next photo requested; auto-advances every ~1.8s; arrows work, reset the timer and never open the listing');

  await page.mouse.move(2, 2);
  await expect(panelOf(page)).toHaveCount(0);
  imageRequests.length = 0;
  await openByHover(page, B);
  const single = await panelOf(page).evaluate(node => ({
    segments: node.querySelectorAll('.home-property-preview__segment').length,
    arrows: node.querySelectorAll('.home-property-preview__nav').length,
    badge: node.querySelector('.home-property-card__badge--new')?.textContent,
    chips: node.querySelectorAll('.home-property-preview__chips').length,
    walk: node.querySelectorAll('.home-property-preview__walk').length,
  }));
  assert.deepEqual(await wrapper(page, B).locator('.home-property-card__badge').allTextContents(), ['New'], 'the card shows the same badge');
  assert.deepEqual(single, { segments: 0, arrows: 0, badge: 'New', chips: 0, walk: 0 });
  await page.waitForTimeout(2300);
  assert.equal(await current(), 0, 'a single photo never auto-advances');
  assert.deepEqual([...new Set(imageRequests)], ['/uploads/listings/b-1.jpg']);
  // "New" is the rating pill's white pill with a red label, identical on the card and in the panel.
  const badgeLook = el => Object.fromEntries(['backgroundColor', 'boxShadow', 'borderRadius', 'color', 'fontSize', 'fontWeight']
    .map(key => [key, getComputedStyle(el)[key]]));
  const newCard = await wrapper(page, B).locator('.home-property-card__badge--new').evaluate(badgeLook);
  const newPanel = await panelOf(page).locator('.home-property-card__badge--new').evaluate(badgeLook);
  assert.deepEqual(newPanel, newCard, '"New" pill looks the same on the card and in the panel');
  assert.equal(newCard.backgroundColor, 'rgb(255, 255, 255)');
  assert.equal(newCard.color, 'rgb(234, 63, 74)');
  const ratingLook = await wrapper(page, A).locator('.home-property-card__badge--rating').evaluate(badgeLook);
  assert.equal(newCard.backgroundColor, ratingLook.backgroundColor);
  assert.equal(newCard.boxShadow, ratingLook.boxShadow);
  assert.equal(newCard.borderRadius, ratingLook.borderRadius);
  checks.push('single photo: no segments, arrows or auto-advance; "New" badge shared with the card; empty chips/walk omitted');
  await closeAll(page);

  await openByHover(page, FEATURED);
  const pillStyle = el => Object.fromEntries(['backgroundColor', 'borderRadius', 'color', 'fontSize', 'height'].map(key => [key, getComputedStyle(el)[key]]));
  const cardOffer = await wrapper(page, FEATURED).locator('.home-property-card__offer').evaluate(pillStyle);
  const panelOffer = await panelOf(page).locator('.home-property-preview__offer').evaluate(pillStyle);
  assert.equal(await panelOf(page).locator('.home-property-preview__offer').textContent(), 'Featured');
  assert.equal(panelOffer.borderRadius, cardOffer.borderRadius);
  assert.equal(panelOffer.height, cardOffer.height);
  const inPanel = await panelOf(page).evaluate(node => {
    const media = node.querySelector('.home-property-preview__media').getBoundingClientRect();
    const offer = node.querySelector('.home-property-preview__offer').getBoundingClientRect();
    return { left: offer.left - media.left, top: offer.top - media.top };
  });
  assert.ok(Math.abs(inPanel.left - 12) < 0.6 && Math.abs(inPanel.top - 30.8) < 0.6, `offer pill position ${JSON.stringify(inPanel)}`);
  checks.push('"Featured" pill appears in the panel with the card pill\'s height and radius, 12px from the left and 30.8px from the top');
  await closeAll(page);

  // ---- 8. keyboard ---------------------------------------------------------------------------------
  await page.context().close();
  page = await openPage();
  let link = await focusLink(page, A, { walk: true });
  await expect(panelOf(page)).toHaveCount(1, { timeout: 150 });
  panelHeart = panelOf(page).locator('.studently-favorite-pulse');
  cardHeart = wrapper(page).locator('.studently-favorite-pulse');
  log = await logOf(page);
  const focusDelay = last(log, 'open').t - last(log, 'link-focus').t;
  assert.ok(focusDelay < 120, `opens right away on :focus-visible (${focusDelay.toFixed(0)}ms)`);
  assert.equal(await panelOf(page).getAttribute('data-via'), 'keyboard');
  await page.keyboard.press('Tab');
  assert.deepEqual(await activeInfo(page), { label: 'Previous photo', inPanel: true, tag: 'BUTTON', card: null });
  await page.waitForTimeout(250);
  await expect(panelOf(page)).toHaveCount(1);
  await page.keyboard.press('Tab');
  assert.equal((await activeInfo(page)).label, 'Next photo');
  await page.keyboard.press('Tab');
  assert.deepEqual([(await activeInfo(page)).inPanel, (await activeInfo(page)).label], [true, 'Save listing']);
  await page.waitForTimeout(250);
  await expect(panelOf(page)).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(cardHeart).toHaveAttribute('aria-pressed', 'true');
  await expect(panelHeart).toHaveAttribute('aria-pressed', 'true');
  await expect(panelOf(page)).toHaveCount(1);
  checks.push(`focus-visible opens it in ${focusDelay.toFixed(0)}ms; Tab moves into arrows and heart without closing; Enter on the panel heart updates the card heart`);

  await page.keyboard.press('Tab'); // past the last control: back through the card link, then on
  await expect(panelOf(page)).toHaveCount(0, { timeout: 400 });
  const after = await activeInfo(page);
  assert.equal(after.inPanel, false);
  assert.notEqual(after.card, 'home-listing-' + A, 'focus continues to the next card instead of getting stuck');
  checks.push('Tab past the last panel control closes it and continues to the next card');
  await wrapper(page).getByRole('button', { name: 'Remove from saved', exact: true }).evaluate(node => node.click());
  await expect.poll(() => writes.length).toBe(6);

  link = await focusLink(page);
  await expect(panelOf(page)).toHaveCount(1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await link.evaluate(node => node === document.activeElement), true, 'Shift+Tab from the first control returns to the card link');
  await page.waitForTimeout(250);
  await expect(panelOf(page)).toHaveCount(1);
  await page.keyboard.press('Shift+Tab'); // card heart, behind the panel
  await expect(panelOf(page)).toHaveCount(0, { timeout: 400 });
  checks.push('Shift+Tab returns to the link with the panel open; focusing the card heart closes it');

  link = await focusLink(page);
  await expect(panelOf(page)).toHaveCount(1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(panelOf(page)).toHaveCount(0, { timeout: 300 });
  assert.equal(await link.evaluate(node => node === document.activeElement), true, 'Escape from inside the panel returns focus to the card link');
  await page.waitForTimeout(700);
  assert.equal(await panelOf(page).count(), 0, 'returning focus after Escape must not reopen the panel');
  checks.push('Escape inside the panel closes it, returns focus to the link and does not reopen');

  link = await focusLink(page);
  await expect(panelOf(page)).toHaveCount(1);
  await page.evaluate(() => document.activeElement.blur());
  await expect(panelOf(page)).toHaveCount(0, { timeout: 300 });
  checks.push('blur closes the panel');

  await page.context().close();

  // ---- 9. geometry at 1440 / 1280 and scale 1 / 1.1; clamping ------------------------------------
  const geometry = [];
  for (const width of [1440, 1280]) {
    for (const scale of [1, 1.1]) {
      page = await openPage({ width, scale });
      await openByHover(page);
      const result = await page.evaluate(listingId => {
        const panelNode = document.querySelector('[data-home-preview]');
        const cardNode = document.querySelector(`[data-testid="home-listing-${listingId}"] .home-property-card`);
        const p = panelNode.getBoundingClientRect(), c = cardNode.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const expectedLeft = Math.min(Math.max(c.left + c.width / 2 - 170, 16), vw - 356);
        return { vw, p: [p.x, p.y, p.width, p.height], c: [c.x, c.y, c.width, c.height],
          expectedLeft, expectedTop: Math.max(c.top - 28, 16), scale: getComputedStyle(panelNode).transform };
      }, A);
      assert.equal(result.p[2], 340, `${width}@${scale}: width stays 340px`);
      assert.ok(result.expectedLeft > 100, `${width}@${scale}: this card is far enough from the edge to test centering, not clamping`);
      assert.ok(Math.abs(result.p[0] - result.expectedLeft) < 0.6, `${width}@${scale}: centered on the card (${result.p[0]} vs ${result.expectedLeft})`);
      assert.ok(Math.abs(result.p[1] - result.expectedTop) < 0.6, `${width}@${scale}: rises 28px above the card`);
      assert.ok(result.p[3] > 330 && result.p[3] < 460, `content-driven height (${result.p[3]})`);
      geometry.push({ width, scale, panelWidth: result.p[2], cardWidth: Math.round(result.c[2] * 10) / 10, left: Math.round(result.p[0] * 10) / 10 });
      await page.context().close();
    }
  }
  checks.push('geometry at 1440 and 1280, scale 1 and 1.1: panel 340px wide, centered on the card, 28px above it ' + JSON.stringify(geometry));

  // Clamping: slide the rail so the card sits near each viewport edge.
  page = await openPage({ width: 1440 });
  const clampCase = async (edge) => {
    await page.mouse.move(2, 2);
    await expect(panelOf(page)).toHaveCount(0);
    await page.evaluate(() => { document.querySelector('.home-property-rail').style.translate = ''; });
    await settle(page);
    const cardBox = (await cardCenter(page)).box;
    const shift = edge === 'left' ? 6 - cardBox.x : 1440 - 6 - (cardBox.x + cardBox.width);
    await page.evaluate(value => { document.querySelector('.home-property-rail').style.translate = `${value}px 0`; }, shift);
    const { x, y } = await cardCenter(page);
    await page.mouse.move(x, y);
    await expect(panelOf(page)).toHaveCount(1);
    await panelOf(page).evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
    const rect = await panelOf(page).boundingBox();
    return { left: rect.x, right: 1440 - (rect.x + rect.width) };
  };
  const leftEdge = await clampCase('left');
  assert.ok(Math.abs(leftEdge.left - 16) < 0.6, `left clamp keeps a 16px margin (got ${leftEdge.left})`);
  const rightEdge = await clampCase('right');
  assert.ok(Math.abs(rightEdge.right - 16) < 0.6, `right clamp keeps a 16px margin (got ${rightEdge.right})`);
  checks.push(`near the left edge the panel sits at x=${leftEdge.left}; near the right edge it keeps ${rightEdge.right}px`);
  await page.context().close();

  // ---- 10. reduced motion ---------------------------------------------------------------------------
  page = await openPage({ reduced: true });
  await openByHover(page);
  const reducedInfo = await panelOf(page).evaluate(node => ({
    duration: getComputedStyle(node).animationDuration,
    states: [...node.querySelectorAll('.home-property-preview__fill')].map(fill => fill.dataset.state),
    fillAnimation: getComputedStyle(node.querySelector('.home-property-preview__fill[data-state="done"]')).animationName,
  }));
  assert.equal(reducedInfo.duration, '0.01s');
  assert.deepEqual(reducedInfo.states, ['done', 'todo', 'todo', 'todo']);
  await page.waitForTimeout(2400);
  assert.equal(await panelOf(page).locator('.home-property-preview__slide').evaluateAll(nodes => nodes.findIndex(node => node.hasAttribute('data-on'))), 0, 'no auto-advance with reduced motion');
  await panelOf(page).getByRole('button', { name: 'Next photo' }).click();
  assert.equal(await panelOf(page).locator('.home-property-preview__slide').evaluateAll(nodes => nodes.findIndex(node => node.hasAttribute('data-on'))), 1, 'arrows still work with reduced motion');
  checks.push('reduced motion: panel still opens with a 10ms grow, no auto-advance or segment animation, arrows still work');
  await page.context().close();

  // ---- 11. narrow viewport and touch: no panel -------------------------------------------------------
  page = await openPage({ width: 899 });
  await hover(page);
  await page.waitForTimeout(900);
  assert.equal(await panelOf(page).count(), 0, 'no panel below 900px');
  await page.setViewportSize({ width: 900, height: 900 });
  await page.mouse.move(2, 2);
  await hover(page);
  await expect(panelOf(page)).toHaveCount(1);
  assert.ok((await panelOf(page).boundingBox()).x >= 15.9, 'at 900px the panel fits');
  checks.push('no panel at 899px; panel at 900px, clamped inside the viewport');
  await page.context().close();

  page = await openPage({ width: 1200, touch: true });
  const touchMedia = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  assert.equal(touchMedia, false, 'touch emulation reports a coarse pointer');
  await settle(page);
  const touchBox = (await cardCenter(page)).box;
  await page.touchscreen.tap(touchBox.x + touchBox.width / 2, touchBox.y + 20);
  await page.waitForTimeout(900);
  assert.equal(await panelOf(page).count(), 0, 'tap must not open the panel');
  await page.mouse.move(touchBox.x + touchBox.width / 2, touchBox.y + touchBox.height / 2);
  await page.waitForTimeout(900);
  assert.equal(await panelOf(page).count(), 0, 'even synthetic mouse events must not open it on touch devices');
  await focusLink(page);
  await page.waitForTimeout(300);
  assert.equal(await panelOf(page).count(), 0, 'keyboard focus on a touch device must not open it either');
  checks.push('touch (coarse pointer): tap, synthetic mouse and focus never open the panel');
  await page.context().close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, writes: writes.length, errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ checks, writes, errors }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
