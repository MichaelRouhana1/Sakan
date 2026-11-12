// Real home page, search cards, listing queries and saved-list mutations.
// Authentication and decorative surfaces are isolated; API state stays in memory.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { chromium, expect } from '@playwright/test';

const frontend = path.resolve(import.meta.dirname, '..');
const listings = [
  { id: '10000000-0000-4000-8000-000000000001', title: 'Live Achrafieh apartment', area: 'Achrafieh' },
  { id: '10000000-0000-4000-8000-000000000002', title: 'Live Hamra room', area: 'Hamra' },
].map((row, i) => ({
  ...row, posterId: 'owner', status: 'active', availability: 'available',
  listingType: 'private_room', unitType: 'private_room', monthlyRentUsd: 300 + i * 50,
  electricity: 'solar', water: 'state_well_24_7', wifiIncluded: true,
  targetAudience: 'anyone', genderRestriction: 'anyone', photos: [], amenities: [],
  createdAt: '2026-11-01', publishedAt: '2026-11-01', expiresAt: '2099-01-01',
}));
const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StudentlyHomePage} from './components/web/home/StudentlyHomePage';
import {ListingResultCard} from './components/web/ListingResultCard';
import {SaveAuthPrompt} from './features/saved/saveAuthPrompt';
import {useListings} from './features/listings/useListings';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
function SearchCards(){
  const query = useListings({sort:'newest',pageSize:6});
  return <div data-testid="search-cards">{query.data?.listings.map(listing => <div key={listing.id} data-testid={'search-listing-'+listing.id} style={{width:240}}><ListingResultCard listing={listing}/></div>)}</div>;
}
function App(){
  const [surface,setSurface] = useState('home');
  window.setSurface = setSurface;
  return <><SaveAuthPrompt/>{surface==='home'?<StudentlyHomePage/>:<SearchCards/>}</>;
}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><App/></QueryClientProvider>);
`;
const stubs = {
  api: `import axios from 'axios';export const API_BASE_URL=location.origin;export const api=axios.create({baseURL:location.origin,headers:{Authorization:'Bearer test-session'}});`,
  auth: `import {useSyncExternalStore} from 'react';const params=new URLSearchParams(location.search);let state={isSignedIn:!params.has('signedout'),isLoading:params.has('loading')};const listeners=new Set();window.setAuth=next=>{state={...state,...next};listeners.forEach(fn=>fn());};export const useAuthSession=()=>{const auth=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state);return {...auth,hasClerkSession:auth.isSignedIn,session:auth.isSignedIn?{userId:'renter'}:null,user:auth.isSignedIn?{email:'renter@example.com'}:null,logout:async()=>window.setAuth({isSignedIn:false})};};`,
  router: `export const router={push:url=>{(window.navigations??=[]).push(url);}};export const useRouter=()=>router;`,
  authModal: `export const StudentlyAuthModal=({visible,title,onClose})=>visible?<div role="dialog" aria-label={title||'Sign in to Studently'}><button onClick={onClose}>Close sign in</button></div>:null;`,
  storage: `export default {getItem:async key=>localStorage.getItem(key),setItem:async(key,value)=>localStorage.setItem(key,value),removeItem:async key=>localStorage.removeItem(key)};`,
  haptics: `export const ImpactFeedbackStyle={Light:'light',Medium:'medium'};export const impactAsync=async()=>{};`,
  navigation: `export const useHostingNavState=()=>({showBecomeAHost:false,showSwitchToHosting:false});export const openCreateListing=()=>{};`,
  universities: `export const useUniversities=()=>({data:[]});`,
  decorations: `export const Ionicons=()=>null;export const MapPin=()=>null;export const StudentlyLogo=()=>null;export const ProductSwitchControl=()=>null;export const DownloadAppButton=()=>null;export const InstitutionLogo=()=>null;export const InsightsMarquee=()=>null;export const BestMatchBadge=()=>null;`,
  gradient: `import {View} from 'react-native';export const LinearGradient=({children,style})=><View style={style}>{children}</View>;`,
  search: `export const SearchAutocomplete=()=>null;`,
  carousel: `import {View} from 'react-native';export const ListingCardCarousel=()=> <View style={{height:150}}/>;`,
  pillIcons: `export const LISTING_PILL_ICONS={};export const highlightTagIcon=()=>undefined;`,
  svg: `export const Svg=()=>null;export const Path=()=>null;export default Svg;`,
};
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: frontend },
  absWorkingDir: frontend, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"test"', __DEV__: 'true' },
  alias: { 'react-native': 'react-native-web' },
  plugins: [{ name: 'isolated-boundaries', setup(builder) {
    const rules = [
      [/^@\/lib\/api$/, 'api'], [/AuthSessionProvider$/, 'auth'],
      [/^expo-router$/, 'router'], [/StudentlyAuthModal$/, 'authModal'],
      [/^@react-native-async-storage\/async-storage$/, 'storage'],
      [/^expo-haptics$/, 'haptics'], [/useHostingNavState$|useEnsureSession$/, 'navigation'],
      [/useUniversities$/, 'universities'], [/^expo-linear-gradient$/, 'gradient'],
      [/SearchAutocomplete$/, 'search'], [/ListingCardCarousel$/, 'carousel'],
      [/^@\/lib\/listingPillIcons$/, 'pillIcons'],
      [/^react-native-svg/, 'svg'],
      [/^@expo\/vector-icons$|^lucide-react-native$|StudentlyLogo$|ProductSwitchControl$|DownloadAppButton$|InstitutionLogo$|InsightsMarquee$|BestMatchBadge$/, 'decorations'],
    ];
    for (const [filter, id] of rules) builder.onResolve({ filter }, () => ({ path: id, namespace: 'stub' }));
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path: id }) => ({ contents: stubs[id], resolveDir: frontend, loader: 'tsx' }));
  } }],
});
const saved = new Set();
const writes = [], listingRequests = [];
let failListings = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bundle.js') {
    res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); return;
  }
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('content-type', 'application/json');
    const reply = data => res.end(JSON.stringify(data));
    if (url.pathname === '/api/listings/home-popular') {
      reply({ data: { areas: ['Achrafieh', 'Hamra', 'Byblos'].map(name => ({ name, count: 1 })), universities: [] } }); return;
    }
    if (url.pathname === '/api/listings') {
      listingRequests.push(Object.fromEntries(url.searchParams));
      if (failListings) { res.statusCode = 500; reply({ error: 'Unavailable' }); return; }
      const area = url.searchParams.get('areas');
      const rows = listings.filter(row => !area || row.area === area);
      // Duplicate across featured/organic must still produce one home card.
      reply({ data: rows, featured: rows.slice(0, 1) }); return;
    }
    if (url.pathname === '/api/saved') {
      reply({ data: listings.filter(row => saved.has(row.id)) }); return;
    }
    const match = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
    if (match && ['POST', 'DELETE'].includes(req.method)) {
      assert.ok(listings.some(row => row.id === match[1]), 'save must reference a live listing');
      assert.equal(req.headers.authorization, 'Bearer test-session');
      writes.push({ method: req.method, id: match[1] });
      if (req.method === 'POST') saved.add(match[1]); else saved.delete(match[1]);
      reply({ data: { listingId: match[1], saved: saved.has(match[1]) } }); return;
    }
    reply({ data: [] }); return;
  }
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/bundle.js"></script>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const checks = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  const homeCard = id => page.getByTestId('home-listing-' + id);
  const first = listings[0].id;
  await page.goto(origin);
  await expect(homeCard(first)).toHaveCount(1);
  await expect(homeCard(first)).toContainText('Live Achrafieh apartment');
  await expect(page.getByText('Sunny 1BR near Sassine', { exact: true })).toHaveCount(0);
  assert.ok((await homeCard(first).boundingBox()).width <= 240);
  await homeCard(first).getByRole('button', { name: 'Save listing', exact: true }).click();
  await expect(homeCard(first).getByRole('button', { name: 'Remove from saved', exact: true })).toBeVisible();
  await expect.poll(() => writes.length).toBe(1);
  assert.deepEqual(writes[0], { method: 'POST', id: first });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  assert.deepEqual(await page.evaluate(() => window.navigations ?? []), []);
  checks.push('signed-in home save uses a real listing ID without login modal or card navigation');

  await page.evaluate(() => window.setSurface('search'));
  const searchCard = page.getByTestId('search-listing-' + first);
  await expect(searchCard.getByRole('button', { name: 'Remove from saved', exact: true })).toBeVisible();
  await searchCard.getByRole('button', { name: 'Remove from saved', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  assert.deepEqual(writes[1], { method: 'DELETE', id: first });
  await page.evaluate(() => window.setSurface('home'));
  await expect(homeCard(first).getByRole('button', { name: 'Save listing', exact: true })).toBeVisible();
  await homeCard(first).getByRole('button', { name: 'Save listing', exact: true }).click();
  await expect.poll(() => writes.length).toBe(3);
  await page.reload();
  await expect(homeCard(first).getByRole('button', { name: 'Remove from saved', exact: true })).toBeVisible();
  checks.push('home/search share saved state, unsaving works, and favorites survive reload');

  await homeCard(first).getByRole('link').click();
  assert.equal((await page.evaluate(() => window.navigations)).at(-1), '/(renter)/listing/' + first);
  await page.getByRole('button', { name: 'Hamra', exact: true }).click();
  await expect(homeCard(listings[1].id)).toBeVisible();
  await expect(homeCard(first)).toHaveCount(0);
  assert.equal(listingRequests.at(-1).areas, 'Hamra');
  await page.getByRole('button', { name: 'Byblos', exact: true }).click();
  await expect(page.getByText('No live listings in this area yet.')).toBeVisible();
  checks.push('cards open the matching detail route; area filters and empty state use real API results');

  const beforeSignedOut = writes.length;
  await page.goto(origin + '?signedout');
  await homeCard(first).getByRole('button', { name: 'Save listing', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sign in to save listings' })).toBeVisible();
  assert.equal(writes.length, beforeSignedOut);
  checks.push('signed-out saves still request sign-in without writing favorites');

  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(origin);
  await homeCard(first).getByRole('button', { name: 'Remove from saved', exact: true }).click();
  await expect(homeCard(first).getByRole('button', { name: 'Save listing', exact: true })).toBeVisible();
  await expect.poll(() => writes.length).toBe(beforeSignedOut + 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  checks.push('mobile home supports unsaving with no login prompt or horizontal overflow');

  failListings = true;
  await page.reload();
  await expect(page.getByText('Places could not be loaded.')).toBeVisible();
  failListings = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(homeCard(first)).toBeVisible();
  checks.push('failed listing loads show retry and recover without demo cards');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, writes, errors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
