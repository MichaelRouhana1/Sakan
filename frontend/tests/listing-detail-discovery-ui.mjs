// Listing detail Similar Places & Recently Viewed UI verification:
// Real ListingDetailRoute (desktop ListingDetailWeb + mobile ListingDetailMobile),
// real HomePropertyRail, HomePropertyCard, HomePropertyPreview, RubberSegment,
// and real localStorage + in-memory API responses.
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import { chromium } from "@playwright/test";

const frontend = path.resolve(import.meta.dirname, "..");
const seedAssetsDir = path.resolve(frontend, "../backend/src/db/seeds/assets");
const screenshotDir = process.env.SCREENSHOT_DIR
  ? path.resolve(process.env.SCREENSHOT_DIR)
  : null;

const makeId = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const demoHash = (value) => {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
};
const unratedId = (() => {
  for (let n = 10; ; n += 1) if (demoHash(makeId(n)) % 3 === 0) return makeId(n);
})();

const PHOTO_FILES = [
  "unit-bedroom.png",
  "unit-living.png",
  "shared-kitchen.png",
  "shared-facade.png",
  "unit-detail.png",
];

const photos = (offset, count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: `photo-${offset}-${i}`,
    url: `/uploads/${PHOTO_FILES[(offset + i) % PHOTO_FILES.length]}`,
    sortOrder: i,
  }));

const baseListing = {
  posterId: "poster-1",
  status: "active",
  availability: "available",
  listingType: "private_room",
  unitType: "private_room",
  electricity: "solar",
  water: "state_well_24_7",
  wifiIncluded: true,
  routerUps: true,
  targetAudience: "students_only",
  genderRestriction: "anyone",
  whatsappNumber: "+96170123456",
  contactPhone: "+96170123456",
  createdAt: "2026-10-01T10:00:00Z",
  publishedAt: "2026-10-01T10:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z",
  amenities: ["ac_all_rooms", "study_desk", "washer"],
};

const SOURCE_ID = makeId(1);
const THIN_SOURCE_ID = makeId(2);
const SIMILAR_1 = makeId(3);
const SIMILAR_2 = unratedId;
const SIMILAR_3 = makeId(5);
const SIMILAR_4 = makeId(6);
const SIMILAR_5 = makeId(7);
const RECENT_1 = makeId(8);
const RECENT_2 = makeId(9);

const listingsById = new Map([
  [
    SOURCE_ID,
    {
      ...baseListing,
      id: SOURCE_ID,
      placeId: "place-source",
      title: "Bright private room near AUB Bliss Gate",
      area: "Hamra",
      landmark: "Bliss Street",
      addressLine: "Bliss Street, Building 14",
      monthlyRentUsd: 450,
      lat: 33.8975,
      lng: 35.4835,
      rating: 4.8,
      reviewCount: 14,
      description: "Quiet furnished student room 3 minutes from AUB main gate with 24/7 solar power.",
      photos: photos(0, 4),
    },
  ],
  [
    THIN_SOURCE_ID,
    {
      ...baseListing,
      id: THIN_SOURCE_ID,
      placeId: "place-thin",
      title: "Calm studio in Zahle",
      area: "Zahle",
      landmark: "Boulevard",
      monthlyRentUsd: 320,
      lat: 33.8467,
      lng: 35.902,
      description: "Clean furnished studio in Zahle.",
      photos: photos(1, 3),
    },
  ],
  [
    SIMILAR_1,
    {
      ...baseListing,
      id: SIMILAR_1,
      placeId: "place-s1",
      title: "1-bedroom student room in Hamra",
      area: "Hamra",
      addressLine: "Makdissi Street",
      monthlyRentUsd: 440,
      rating: 4.7,
      reviewCount: 11,
      similarityReason: "Same area",
      photos: photos(1, 4),
    },
  ],
  [
    SIMILAR_2,
    {
      ...baseListing,
      id: SIMILAR_2,
      placeId: "place-s2",
      title: "Sunlit dorm residence in Gemmayzeh",
      area: "Gemmayzeh",
      addressLine: "Gouraud Street",
      monthlyRentUsd: 470,
      publishedAt: new Date().toISOString(),
      similarityReason: "Similar price",
      photos: photos(2, 3),
    },
  ],
  [
    SIMILAR_3,
    {
      ...baseListing,
      id: SIMILAR_3,
      placeId: "place-s3",
      title: "Private room in Verdun · Campus: Beirut",
      area: "Verdun",
      monthlyRentUsd: 420,
      rating: 4.5,
      reviewCount: 8,
      similarityReason: "Nearby",
      photos: photos(3, 3),
    },
  ],
  [
    SIMILAR_4,
    {
      ...baseListing,
      id: SIMILAR_4,
      placeId: "place-s4",
      title: "Cozy studio near LAU Beirut",
      area: "Ras Beirut",
      monthlyRentUsd: 495,
      rating: 4.6,
      reviewCount: 6,
      similarityReason: "Same campus",
      photos: photos(4, 3),
    },
  ],
  [
    SIMILAR_5,
    {
      ...baseListing,
      id: SIMILAR_5,
      placeId: "place-s5",
      title: "Modern student suite in Achrafieh",
      area: "Achrafieh",
      monthlyRentUsd: 460,
      rating: 4.4,
      reviewCount: 5,
      similarityReason: "Similar price",
      photos: photos(0, 3),
    },
  ],
  [
    RECENT_1,
    {
      ...baseListing,
      id: RECENT_1,
      placeId: "place-r1",
      title: "1-bedroom residence in Mar Mikhael",
      area: "Mar Mikhael",
      monthlyRentUsd: 520,
      rating: 4.9,
      reviewCount: 9,
      photos: photos(2, 3),
    },
  ],
  [
    RECENT_2,
    {
      ...baseListing,
      id: RECENT_2,
      placeId: "place-r2",
      title: "Furnished studio in Badaro",
      area: "Badaro",
      monthlyRentUsd: 390,
      publishedAt: new Date().toISOString(),
      photos: photos(4, 3),
    },
  ],
]);

const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ListingDetailRoute} from './components/listings/detail/ListingDetailRoute';
import {SaveAuthPrompt} from './features/saved/saveAuthPrompt';
const params = new URLSearchParams(location.search);
const listingId = params.get('id') || '${SOURCE_ID}';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={client}>
    <SaveAuthPrompt/>
    <ListingDetailRoute listingId={listingId}/>
  </QueryClientProvider>
);
`;

const stubs = {
  api: `import axios from 'axios';export const API_BASE_URL=location.origin;export const api=axios.create({baseURL:location.origin,headers:{Authorization:'Bearer test-session'}});`,
  auth: `import {useSyncExternalStore} from 'react';const state={isSignedIn:true,isLoading:false,hasClerkSession:true,session:{userId:'renter-1',role:'renter'},user:{id:'renter-1',email:'renter@example.com'},logout:async()=>{}};export const useAuthSession=()=>useSyncExternalStore(()=>()=>{},()=>state);export const useOptionalAuthSession=()=>useAuthSession();`,
  router: `export const router={push:url=>{(window.navigations??=[]).push(url);},replace:url=>{(window.navigations??=[]).push(url);},back:()=>{}};export const useRouter=()=>router;export const usePathname=()=>'/listing/'+(new URLSearchParams(location.search).get('id')||'${SOURCE_ID}');export const useLocalSearchParams=()=>({id:new URLSearchParams(location.search).get('id')||'${SOURCE_ID}'});export const Link=({href,children,...props})=><a {...props} href={href}>{children}</a>;`,
  authModal: `export const StudentlyAuthModal=()=>null;`,
  storage: `export default {getItem:async key=>localStorage.getItem(key),setItem:async(key,value)=>localStorage.setItem(key,value),removeItem:async key=>localStorage.removeItem(key)};`,
  haptics: `export const ImpactFeedbackStyle={Light:'light',Medium:'medium'};export const impactAsync=async()=>{};`,
  clipboard: `export const setStringAsync=async()=>{};`,
  navigation: `export const useHostingNavState=()=>({showBecomeAHost:false,showSwitchToHosting:false});export const openCreateListing=()=>{};`,
  universities: `export const useUniversities=()=>({data:[{id:'u-aub',slug:'aub',name:'AUB Main Campus',displayName:'AUB — Beirut Campus',lat:33.9006,lng:35.4819,institutionSlug:'aub'}],isPending:false,isError:false,refetch:async()=>{}});`,
  pinMap: `import React from 'react';export const ListingPinMap=({height=300})=><div style={{height,background:'linear-gradient(135deg,#dbeafe 0%,#e2e8f0 45%,#dcfce7 100%)',display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',fontFamily:'DMSans_500Medium,sans-serif',fontSize:14}}>Interactive Map · Hamra, Beirut</div>;`,
  topNav: `import React from 'react';export const WebTopNav=()=><header style={{height:70,background:'#fff',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',padding:'0 32px',fontFamily:'DMSans_600SemiBold,sans-serif',fontSize:18,color:'#111827'}}>Studently</header>;`,
  decorations: `import React from 'react';export const Ionicons=({name,size=16,color='#111'})=><span aria-hidden="true" style={{display:'inline-block',width:size,height:size,lineHeight:size+'px',textAlign:'center',color,fontSize:Math.max(10,size-2)}}>{name==='star'?'★':name==='chevron-back'?'‹':name==='chevron-forward'?'›':''}</span>;export const MapPin=()=>null;export const StudentlyLogo=()=>null;export const ProductSwitchControl=()=>null;export const DownloadAppButton=()=>null;export const InstitutionLogo=()=>null;export const ListingMoreMenu=()=>null;`,
  gradient: `import {View} from 'react-native';export const LinearGradient=({children,style})=><View style={style}>{children}</View>;`,
  image: `import React from 'react';export const Image=({source,style})=>{const uri=typeof source==='object'&&source?source.uri:source;return <img src={uri} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',...(style||{})}}/>;};`,
  safearea: `import {View} from 'react-native';export const useSafeAreaInsets=()=>({top:0,right:0,bottom:0,left:0});export const SafeAreaView=View;`,
  svg: `export const Svg=()=>null;export const Path=()=>null;export default Svg;`,
  carousel: `import React from 'react';export const ListingCardCarousel=({urls=[],onPressCard})=><div data-home-carousel="" onClick={onPressCard} style={{width:'100%',height:'100%',overflow:'hidden',cursor:'pointer',background:'#e8eef6'}}>{urls[0]?<img src={urls[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:null}</div>;`,
  campusSelect: `export const CampusFormSelect=()=>null;`,
  pillIcons: `export const LISTING_PILL_ICONS={};export const highlightTagIcon=()=>undefined;`,
};

const bundle = await build({
  stdin: { contents: entry, loader: "tsx", resolveDir: frontend },
  absWorkingDir: frontend,
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  outfile: path.join(frontend, ".expo/detail-discovery-tests/bundle.js"),
  resolveExtensions: [".web.tsx", ".tsx", ".web.ts", ".ts", ".web.js", ".js", ".jsx", ".json"],
  loader: { ".png": "dataurl", ".jpg": "dataurl", ".webp": "dataurl" },
  define: { "process.env.NODE_ENV": '"test"', __DEV__: "true" },
  alias: { "react-native": "react-native-web" },
  plugins: [
    {
      name: "isolated-boundaries",
      setup(builder) {
        const rules = [
          [/^@\/lib\/api$/, "api"],
          [/AuthSessionProvider$/, "auth"],
          [/^expo-router$/, "router"],
          [/StudentlyAuthModal$/, "authModal"],
          [/^@react-native-async-storage\/async-storage$/, "storage"],
          [/^expo-haptics$/, "haptics"],
          [/^expo-clipboard$/, "clipboard"],
          [/useHostingNavState$|useEnsureSession$/, "navigation"],
          [/useUniversities$/, "universities"],
          [/ListingPinMap$/, "pinMap"],
          [/WebTopNav$/, "topNav"],
          [/^expo-linear-gradient$/, "gradient"],
          [/^expo-image$/, "image"],
          [/^react-native-safe-area-context$/, "safearea"],
          [/^react-native-svg/, "svg"],
          [/ListingCardCarousel$/, "carousel"],
          [/CampusFormSelect$/, "campusSelect"],
          [/^@\/lib\/listingPillIcons$/, "pillIcons"],
          [/^@expo\/vector-icons$|^lucide-react-native$|StudentlyLogo$|ProductSwitchControl$|DownloadAppButton$|InstitutionLogo$|ListingMoreMenu$/, "decorations"],
        ];
        for (const [filter, name] of rules) {
          builder.onResolve({ filter }, () => ({ path: name, namespace: "stub" }));
        }
        builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path: name }) => ({
          contents: stubs[name],
          resolveDir: frontend,
          loader: "tsx",
        }));
      },
    },
  ],
});

const saved = new Set();
const assetCache = new Map();
async function loadAsset(name) {
  if (!assetCache.has(name)) {
    assetCache.set(name, await readFile(path.join(seedAssetsDir, name)));
  }
  return assetCache.get(name);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/bundle.js") {
    res.setHeader("content-type", "text/javascript");
    res.end(bundle.outputFiles.find((f) => f.path.endsWith(".js")).contents);
    return;
  }
  if (url.pathname === "/bundle.css") {
    res.setHeader("content-type", "text/css");
    res.end(bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.contents ?? "");
    return;
  }
  const font = url.pathname.match(/^\/fonts\/(400Regular|500Medium|600SemiBold|700Bold)$/)?.[1];
  if (font) {
    const candidates = [
      path.resolve(frontend, "node_modules/@expo-google-fonts/dm-sans", font, `DMSans_${font}.ttf`),
      path.resolve(frontend, ".expo/detail-dedup-export/assets/node_modules/@expo-google-fonts/dm-sans", font),
    ];
    try {
      res.setHeader("content-type", "font/ttf");
      res.end(await readFile(candidates[0]));
      return;
    } catch {
      res.statusCode = 404;
      res.end();
      return;
    }
  }
  if (url.pathname.startsWith("/uploads/")) {
    const file = path.basename(url.pathname);
    const bytes = await loadAsset(PHOTO_FILES.includes(file) ? file : PHOTO_FILES[0]);
    res.setHeader("content-type", "image/png");
    res.end(bytes);
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.setHeader("content-type", "application/json");
    const reply = (data) => res.end(JSON.stringify(data));
    if (url.pathname === "/api/saved") {
      reply({ data: Array.from(saved).map((id) => listingsById.get(id)).filter(Boolean) });
      return;
    }
    const saveMatch = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
    if (saveMatch) {
      if (req.method === "POST") saved.add(saveMatch[1]);
      if (req.method === "DELETE") saved.delete(saveMatch[1]);
      reply({ data: { listingId: saveMatch[1], saved: saved.has(saveMatch[1]) } });
      return;
    }
    if (url.pathname === "/api/listings/batch") {
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
      reply({ data: ids.map((id) => listingsById.get(id)).filter(Boolean) });
      return;
    }
    const similarMatch = url.pathname.match(/^\/api\/listings\/([^/]+)\/similar$/);
    if (similarMatch) {
      if (similarMatch[1] === THIN_SOURCE_ID) {
        // Only 2 similar items (< 3 threshold)
        reply({ data: [listingsById.get(SIMILAR_1), listingsById.get(SIMILAR_2)] });
        return;
      }
      reply({
        data: [
          listingsById.get(SIMILAR_1),
          listingsById.get(SIMILAR_2),
          listingsById.get(SIMILAR_3),
          listingsById.get(SIMILAR_4),
          listingsById.get(SIMILAR_5),
        ],
      });
      return;
    }
    const nearbyMatch = url.pathname.match(/^\/api\/listings\/([^/]+)\/nearby$/);
    if (nearbyMatch) {
      reply({ data: [] });
      return;
    }
    const viewMatch = url.pathname.match(/^\/api\/listings\/([^/]+)\/view$/);
    if (viewMatch) {
      reply({ data: { id: viewMatch[1], viewCount: 10, counted: true } });
      return;
    }
    const detailMatch = url.pathname.match(/^\/api\/listings\/([^/]+)$/);
    if (detailMatch && listingsById.has(detailMatch[1])) {
      reply({ data: listingsById.get(detailMatch[1]) });
      return;
    }
    reply({ data: [] });
    return;
  }
  res.setHeader("content-type", "text/html");
  res.end(`<!doctype html>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;background:#F9FAFB}
      @font-face{font-family:DMSans_400Regular;src:url(/fonts/400Regular)}
      @font-face{font-family:DMSans_500Medium;src:url(/fonts/500Medium)}
      @font-face{font-family:DMSans_600SemiBold;src:url(/fonts/600SemiBold)}
      @font-face{font-family:DMSans_700Bold;src:url(/fonts/700Bold)}
    </style>
    <div id="root"></div>
    <link rel="stylesheet" href="/bundle.css">
    <script src="/bundle.js"></script>`);
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: "msedge" });

const checks = [];
const ok = (msg) => {
  checks.push(msg);
  console.log("  ok -", msg);
};

if (screenshotDir) {
  await mkdir(screenshotDir, { recursive: true });
}

try {
  // 1. DESKTOP (1280x800)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.addInitScript(
      ({ key, items }) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, items }));
      },
      {
        key: "studently.recentlyViewedListings.v1:account:renter-1",
        items: [
          { id: RECENT_1, viewedAt: 3000 },
          { id: RECENT_2, viewedAt: 2000 },
          { id: SIMILAR_3, viewedAt: 1000 },
        ],
      },
    );

    await page.goto(`${origin}/?id=${SOURCE_ID}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="listing-discovery-section"]');

    const layout = await page.evaluate(() => {
      const mapEl = document.getElementById("listing-map");
      const discEl = document.getElementById("listing-similar");
      const mapRect = mapEl?.getBoundingClientRect();
      const discRect = discEl?.getBoundingClientRect();
      const cards = Array.from(discEl?.querySelectorAll(".home-property-card") ?? []);
      const badges = cards.map((c) => c.querySelector(".home-property-card__badge")?.textContent?.trim() ?? null);
      const titles = cards.map((c) => c.querySelector(".home-property-card__title")?.textContent?.trim());
      const prices = cards.map((c) => c.querySelector(".home-property-card__price")?.textContent?.trim());
      return {
        belowMap: Boolean(mapRect && discRect && discRect.top >= mapRect.bottom - 2),
        insideMainCol: Boolean(mapRect && discRect && Math.abs(discRect.right - mapRect.right) <= 4),
        cardCount: cards.length,
        badges,
        titles,
        prices,
        hasClearBtn: Boolean(discEl?.textContent?.includes("Clear")),
      };
    });

    assert.equal(layout.belowMap, true, "Discovery section must render below #listing-map");
    assert.equal(layout.insideMainCol, true, "Discovery section must align within mainCol (no sidebar overlap)");
    assert.equal(layout.cardCount, 5, "Should render all 5 similar HomePropertyCards");
    assert.ok(layout.badges.some((b) => b?.includes("/5")), "Rating cutout badge present");
    assert.ok(layout.badges.includes("New"), "New cutout badge present");
    assert.equal(layout.prices[0], "From $440/month");
    assert.equal(layout.hasClearBtn, false, "No Clear button in v1");
    ok("desktop renders Similar places below map inside mainCol with exact HomePropertyCard badges & prices");

    // Scroll discovery section into view for desktop Similar screenshot
    await page.locator("#listing-similar").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "desktop-similar.png") });
    }

    // Verify hover preview opens on desktop detail card (same as Home)
    const firstCard = page.locator("#listing-similar .home-property-card").first();
    await firstCard.hover();
    await page.waitForSelector("[data-home-preview]", { timeout: 2000 });
    ok("desktop hover preview portal opens on Similar places card just like Home");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);

    // Toggle to Recently viewed
    await page.getByRole("button", { name: "Recently viewed" }).click();
    await page.waitForTimeout(350);

    const recentState = await page.evaluate((sourceId) => {
      const discEl = document.getElementById("listing-similar");
      const heading = discEl?.querySelector('[role="heading"]')?.textContent?.trim();
      const cards = Array.from(discEl?.querySelectorAll(".home-property-card") ?? []);
      const hrefs = cards.map((c) => c.querySelector("a.home-property-card__body")?.getAttribute("href"));
      return {
        heading,
        cardCount: cards.length,
        hrefs,
        excludesSource: !hrefs.some((h) => h?.includes(sourceId)),
        hasClearBtn: Boolean(discEl?.textContent?.includes("Clear")),
      };
    }, SOURCE_ID);

    assert.equal(recentState.heading, "Recently viewed");
    assert.equal(recentState.cardCount, 3, "Should show the 3 previously viewed listings");
    assert.equal(recentState.excludesSource, true, "Must exclude the currently viewed listing");
    assert.equal(recentState.hasClearBtn, false, "No Clear button in v1");
    ok("desktop toggles to Recently viewed via RubberSegment, excludes active listing, and hides Clear button");

    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "desktop-recent.png") });
    }

    assert.deepEqual(errors, [], "No desktop page errors");
    await ctx.close();
  }

  // 2. MOBILE WEB (390x844)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.addInitScript(
      ({ key, items }) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, items }));
      },
      {
        key: "studently.recentlyViewedListings.v1:account:renter-1",
        items: [
          { id: RECENT_1, viewedAt: 3000 },
          { id: RECENT_2, viewedAt: 2000 },
        ],
      },
    );

    await page.goto(`${origin}/?id=${SOURCE_ID}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="listing-discovery-section"]');

    const hasSimilarTab = await page.getByRole("tab", { name: "Similar" }).isVisible();
    assert.equal(hasSimilarTab, true, "Mobile sticky tabs include Similar jump tab");

    await page.locator('[data-testid="listing-discovery-section"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const mobileSimilarCount = await page.locator('[data-testid="listing-discovery-section"] .home-property-card').count();
    assert.equal(mobileSimilarCount, 5);
    ok("mobile web renders Similar places at bottom with exact HomePropertyCard rail & sticky Similar tab");

    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "mobile-similar.png") });
    }

    await page.getByRole("button", { name: "Recently viewed" }).click();
    await page.waitForTimeout(350);
    const mobileRecentCount = await page.locator('[data-testid="listing-discovery-section"] .home-property-card').count();
    assert.equal(mobileRecentCount, 2);
    ok("mobile web toggles to Recently viewed cleanly");

    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "mobile-recent.png") });
    }

    assert.deepEqual(errors, [], "No mobile page errors");
    await ctx.close();
  }

  // 3. FALLBACK: < 3 similar + has recently viewed => hide Similar, default directly to Recently viewed
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(
      ({ key, items }) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, items }));
      },
      {
        key: "studently.recentlyViewedListings.v1:account:renter-1",
        items: [{ id: RECENT_1, viewedAt: 3000 }],
      },
    );
    await page.goto(`${origin}/?id=${THIN_SOURCE_ID}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="listing-discovery-section"]');
    const fallbackState = await page.evaluate(() => {
      const disc = document.getElementById("listing-similar");
      return {
        heading: disc?.querySelector('[role="heading"]')?.textContent?.trim(),
        toggleButtons: disc?.querySelectorAll(".studently-rubber-segment__item").length ?? 0,
        cards: disc?.querySelectorAll(".home-property-card").length ?? 0,
      };
    });
    assert.equal(fallbackState.heading, "Recently viewed");
    assert.equal(fallbackState.toggleButtons, 0, "Similar toggle hidden when < 3 similar results");
    assert.equal(fallbackState.cards, 1);
    ok("hides Similar places and defaults directly to Recently viewed when similar count < 3");
    await ctx.close();
  }

  // 4. FALLBACK: < 3 similar + 0 recently viewed => hide entire section
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${origin}/?id=${THIN_SOURCE_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const hiddenCount = await page.locator("#listing-similar, [data-testid='listing-discovery-section']").count();
    assert.equal(hiddenCount, 0, "Entire discovery section and border wrapper hidden when both are empty/insufficient");
    ok("hides entire discovery section with zero orphan divider when similar < 3 and recently viewed is empty");
    await ctx.close();
  }

  console.log(`\nALL ${checks.length} LISTING DETAIL DISCOVERY UI CHECKS PASSED`);
} finally {
  await browser.close();
  server.close();
}
