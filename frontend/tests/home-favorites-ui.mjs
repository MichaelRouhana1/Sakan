// Real home page, search cards, listing queries and saved-list mutations.
// Authentication and decorative surfaces are isolated; API state stays in memory.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
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
import {SavedListingToast} from './features/saved/SavedListingToast';
import {useIsSaved,useToggleSaved} from './features/saved/useSavedListings';
import {ListingCard} from './components/listings/ListingCard';
import {ListingMapCarouselCard} from './components/listings/ListingMapCarouselCard';
import {ListingContactCard} from './components/listings/detail/ListingContactCard';
import {ListingDetailGallery} from './components/listings/detail/ListingDetailGallery';
import {useListings} from './features/listings/useListings';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
function SearchCards(){
  const query = useListings({sort:'newest',pageSize:6});
  return <div data-testid="search-cards" style={{paddingTop:120}}>{query.data?.listings.map(listing => <div key={listing.id} data-testid={'search-listing-'+listing.id} style={{width:240}}><ListingResultCard listing={listing}/></div>)}</div>;
}
const sample=${JSON.stringify(listings[0])};
function FavoriteExamples({kind}){
 const {data:saved=false}=useIsSaved(sample.id);const toggle=useToggleSaved();const [mode,setMode]=useState('photos');
 const props={listing:sample,onPress:()=>{(window.navigations??=[]).push('card-open');}};
 return <div data-testid="favorite-example" style={{paddingTop:120,width:kind==='list'?800:360,maxWidth:'100%'}}>
  {kind==='map'?<ListingMapCarouselCard {...props} width={300}/>:kind==='native-card'?<ListingCard {...props}/>:kind==='contact'?<ListingContactCard listing={sample} title={sample.title} price="$300" priceLabel="Monthly rent" saved={saved} onSave={()=>toggle.mutate(sample)} onShare={()=>{}} onWhatsApp={()=>{}} onCall={()=>{}} onReport={()=>{}}/>:kind==='gallery'?<ListingDetailGallery listing={sample} height={240} saved={saved} onToggleSave={()=>toggle.mutate(sample)} onBack={()=>{}} mode={mode} onModeChange={setMode}/>:<ListingResultCard listing={sample} variant={kind==='list'?'list':'grid'} interactive={kind!=='preview'}/>}
 </div>;
}
function App(){
  const [surface,setSurface] = useState('home');
  window.setSurface = setSurface;
  return <><SaveAuthPrompt/>{surface==='home'?<StudentlyHomePage/>:surface==='search'?<SearchCards/>:<FavoriteExamples kind={surface}/>}<SavedListingToast/></>;
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
  decorations: `export const Ionicons=()=>null;export const MapPin=()=>null;export const StudentlyLogo=()=>null;export const ProductSwitchControl=()=>null;export const DownloadAppButton=()=>null;export const InstitutionLogo=()=>null;export const InsightsMarquee=()=>null;export const BestMatchBadge=()=>null;export const ListingMoreMenu=()=>null;`,
  gradient: `import {View} from 'react-native';export const LinearGradient=({children,style})=><View style={style}>{children}</View>;`,
  search: `export const SearchAutocomplete=()=>null;`,
  carousel: `import {View} from 'react-native';export const ListingCardCarousel=()=> <View style={{height:150}}/>;`,
  pillIcons: `export const LISTING_PILL_ICONS={};export const highlightTagIcon=()=>undefined;`,
  image: `export const Image=()=>null;`,
  gallery: `import {View} from 'react-native';export const ListingGallery=()=> <View style={{height:240}}/>;export const ListingPinMap=()=>null;`,
  safearea: `import {View} from 'react-native';export const useSafeAreaInsets=()=>({top:0,right:0,bottom:0,left:0});export const SafeAreaView=View;`,
  svg: `export const Svg=()=>null;export const Path=()=>null;export default Svg;`,
};
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: frontend },
  absWorkingDir: frontend, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic',
  outfile: path.join(frontend,'.expo/pulse-heart-tests/bundle.js'),
  resolveExtensions: ['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.jsx','.json'],
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
      [/ListingGallery$|ListingPinMap$/, 'gallery'],
      [/^react-native-safe-area-context$/, 'safearea'],
      [/^@expo\/vector-icons$|^lucide-react-native$|StudentlyLogo$|ProductSwitchControl$|DownloadAppButton$|InstitutionLogo$|InsightsMarquee$|BestMatchBadge$|ListingMoreMenu$/, 'decorations'],
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
    res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents); return;
  }
  if (url.pathname === '/bundle.css') { res.setHeader('content-type','text/css');res.end(bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.contents??'');return; }
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
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><link rel="stylesheet" href="/bundle.css"><script src="/bundle.js"></script>');
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
  // Check the same shared control on every active favorite surface.
  failListings=false;await page.setViewportSize({width:1440,height:1000});await page.goto(origin);
  const output=path.resolve(frontend,'../artifacts/pulse-heart');await mkdir(output,{recursive:true});
  for(const width of [375,768,1440])for(const kind of ['search','list','native-card','map','contact','gallery']){
    await page.setViewportSize({width,height:1000});await page.evaluate(value=>window.setSurface(value),kind);
    const heart=(kind==='search'?page.getByTestId('search-listing-'+first):page.getByTestId('favorite-example')).locator('.studently-favorite-pulse').first();
    await expect(heart).toBeVisible();
    const before=await heart.boundingBox();const pressed=await heart.getAttribute('aria-pressed');const writesBefore=writes.length;
    const navigationsBefore=await page.evaluate(()=>(window.navigations??[]).length);
    await heart.click();await expect(heart).toHaveAttribute('aria-pressed',pressed==='true'?'false':'true');
    await expect.poll(()=>writes.length).toBe(writesBefore+1);
    await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
    const after=await heart.boundingBox();assert.equal(after.width,before.width);assert.equal(after.height,before.height);
    assert.equal(await page.evaluate(()=>(window.navigations??[]).length),navigationsBefore);
    if(width===1440)await page.getByTestId(kind==='search'?'search-listing-'+first:'favorite-example').screenshot({path:path.join(output,kind+'.png')});
  }
  checks.push('one shared pulse control works on grid/list cards, map cards, detail contact cards and mobile galleries at 375/768/1440 without resizing or opening the listing');

  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.setSurface('search'));
  let heart=page.getByTestId('search-listing-'+first).locator('.studently-favorite-pulse');
  if((await heart.getAttribute('aria-pressed'))==='true'){await heart.click();await expect(heart).toHaveAttribute('aria-pressed','false');await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);}
  await heart.evaluate(el=>{
    window.pulseFrames=[];const start=performance.now();
    const sample=()=>{const transform=getComputedStyle(el.querySelector('.studently-favorite-pulse__surface')).transform;const scale=transform==='none'?1:new DOMMatrixReadOnly(transform).a;const box=el.getBoundingClientRect();window.pulseFrames.push({scale,width:box.width,height:box.height,liked:el.getAttribute('data-liked')});if(performance.now()-start<900)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  await heart.click();await expect(heart).toHaveAttribute('data-running','');await expect(heart).toHaveAttribute('data-liked','true');
  await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  const frames=await page.evaluate(()=>window.pulseFrames);
  assert.ok(Math.min(...frames.map(frame=>frame.scale))<.4,'heart must contract to the reference dot phase');
  assert.ok(Math.max(...frames.map(frame=>frame.scale))>1.02,'heart must pulse beyond its resting scale');
  assert.equal(new Set(frames.map(frame=>frame.width+':'+frame.height)).size,1);
  await writeFile(path.join(output,'animation-frames.json'),JSON.stringify(frames,null,2));
  await heart.screenshot({path:path.join(output,'heart-saved.png')});
  checks.push('animation contracts to a dot, changes color, overshoots and settles without changing the button layout');

  const beforeInterrupted=writes.length;
  const interruption=await heart.evaluate(async el=>{
    const surface=el.querySelector('.studently-favorite-pulse__surface');
    const scale=()=>{const transform=getComputedStyle(surface).transform;return transform==='none'?1:new DOMMatrixReadOnly(transform).a;};
    const until=predicate=>new Promise((resolve,reject)=>{
      const start=performance.now();
      const tick=()=>{if(predicate())resolve();else if(performance.now()-start>2000)reject(new Error('pulse did not reach expected phase'));else requestAnimationFrame(tick);};tick();
    });
    el.click();await until(()=>scale()<.6);
    const before=scale();
    const oldPulse=surface.getAnimations()[0];
    el.click();await until(()=>surface.getAnimations()[0]!==oldPulse);
    const after=scale();
    return {before,after,animations:el.getAnimations({subtree:true}).length};
  });
  assert.ok(Math.abs(interruption.after-interruption.before)<.15,'interrupting a pulse must preserve its current scale');
  assert.equal(interruption.animations,3,'scale and both opacity layers must use browser-managed animations');
  await expect.poll(()=>writes.length).toBe(beforeInterrupted+2);
  await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  await expect(heart).toHaveAttribute('aria-pressed','true');
  assert.equal(await heart.evaluate(el=>el.getAnimations({subtree:true}).length),0);
  checks.push('interrupting a contracted heart preserves its scale and releases all animations after settling');

  await heart.focus();await page.keyboard.press('Space');await expect(heart).toHaveAttribute('aria-pressed','false');await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  await page.keyboard.press('Enter');await expect(heart).toHaveAttribute('aria-pressed','true');await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  await page.emulateMedia({reducedMotion:'reduce'});await heart.click();await expect(heart).toHaveAttribute('data-liked','false');await expect(heart).not.toHaveAttribute('data-running','');
  await page.emulateMedia({reducedMotion:'no-preference'});
  checks.push('keyboard toggles and reduced-motion preference preserve favorite state');

  const beforeBurst=writes.length;
  await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await heart.click();await expect(heart).toHaveAttribute('aria-pressed','false');
  await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>writes.length).toBe(beforeBurst+3);
  await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  await expect(heart).toHaveAttribute('data-liked','true');await expect.poll(()=>saved.has(first)).toBe(true);
  await heart.click();await expect(heart).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>saved.has(first)).toBe(false);
  await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  checks.push('rapid taps during the pulse keep the latest saved state without duplicate writes');

  await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await page.locator('.swipe-toast').filter({hasText:'Added to favorites'}).getByRole('button',{name:'Undo',exact:true}).last().click();
  await expect(heart).toHaveAttribute('aria-pressed','false');await expect.poll(()=>saved.has(first)).toBe(false);
  await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);
  checks.push('favorite toast Undo reverses the pulse and saved state');

  const failure=async route=>route.fulfill({status:500,json:{error:{message:'Save failed'}}});
  await page.route('**/api/saved/'+first,failure);await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed','false');await expect.poll(()=>heart.getAttribute('data-running')).toBe(null);await expect(heart).toHaveAttribute('data-liked','false');
  await page.unroute('**/api/saved/'+first,failure);
  checks.push('failed saves restore the unfilled heart');

  await page.evaluate(()=>window.setSurface('preview'));heart=page.getByTestId('favorite-example').locator('.studently-favorite-pulse');
  const beforePreview=writes.length;await expect(heart).toBeDisabled();await heart.click({force:true});assert.equal(writes.length,beforePreview);
  checks.push('preview hearts remain disabled');
  await page.goto(origin+'?signedout');heart=homeCard(first).locator('.studently-favorite-pulse');await heart.click();
  await expect(page.getByRole('dialog',{name:'Sign in to save listings'})).toBeVisible();await expect(heart).toHaveAttribute('data-liked','false');await expect(heart).not.toHaveAttribute('data-running','');
  checks.push('signed-out clicks open sign-in without a false saved animation');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, writes, errors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
