# Site Teardown: Amber Student Homepage

**URL:** https://amberstudent.com/  
**Built by:** Amberstudent (in-house product eng; author meta `Amberstudent`; HQ address in Organization schema: Pune, India)  
**Platform:** Custom React SPA with SSR/hydration — CSS Modules, code-split chunks (`data-chunk="HomeDesktop"` / `main`), `react-helmet`, Redux `window.__INITIAL_STATE__`, `@loadable` / webpack-style chunk loading, Partytown for third-party pixels. **Not** Next.js (`__NEXT_DATA__` absent). Desktop build suffix: `*.desktop.css` / `*.desktop.js`.  
**Date analyzed:** 2026-08-06  
**Sources:** Saved HTML `research/_amber-homepage-raw.html` (not re-fetched). Confirmed CSS from all 10 HomeDesktop + main stylesheets. Selective JS from `main.*.desktop.js` (~1.0MB) + chunk `1343.*.desktop.js`. Remaining HomeDesktop JS chunks **not** fully decompiled (size/time); behaviors marked **inferred** vs **confirmed from source**.

---

## Tech Stack (Confirmed from Source)

| Technology | Evidence | Purpose |
|---|---|---|
| React (JSX runtime) | `main.js` fingerprints `react.production` / JSX; CSS Modules class maps; `data-react-helmet` | UI framework |
| CSS Modules | Classes like `HeroSectionDesktopStyles-module__heroImg`, `popularCitites-module__cityTile` | Scoped styling |
| Code-split chunks | `<link data-chunk="HomeDesktop">`, `data-chunk="main"` | Homepage lazy bundles |
| Redux (or Redux-like) | `window.__INITIAL_STATE__={searchPageData:...}`; `redux` string hits in `main.js` | App/search state hydration |
| react-helmet | `data-react-helmet="true"` on title/meta/scripts | Head management |
| @loadable / chunk loader | `@loadable` refs in `main.js`; `data-chunk` attributes | Async component loading |
| Axios | Axios fingerprints in `main.js` | API client |
| Partytown | Inline Partytown bootstrap + `type="text/partytown"` pattern | Off-main-thread analytics |
| Trustpilot widgets | `data-businessunit-id`, Trustpilot script attrs, `TrustPilotBanner` / `TrustPilotDynamicWidget` modules | Social proof |
| Schema.org JSON-LD | 29 `application/ld+json` blocks (Organization, SoftwareApplication, etc.) | SEO |
| CDN static assets | `cdn-static-assets.amberstudent.com`, `static-assets.amberstudent.com`, `assets.amberstudent.com/inventories/...` | CSS/JS + images |
| No GSAP / Framer / Swiper / Lottie | Searched `main.js` + home chunk — no hits | Motion is CSS + light React |

**Third-party (skip for clone):** GTM/pixels, Reddit pixel, OpenAI ads SDK, TikTok/Snap forwarded via Partytown, Trustpilot embed scripts.

---

## Design System

### Colors

| Name/Usage | Value | Evidence |
|---|---|---|
| Brand / Amber Red (primary) | `#ed3a56` | CSS var `--Colors-amberRed-400`; icon accent `var(--whitelabel_accessible_primary_color,#ed3a56)` — **confirmed** |
| Brand red dark | `#d52d44` | `--Colors-amberRed-600` — **confirmed** |
| Brand red soft | `#ec919c` | `--Colors-amberRed-200` — **confirmed** |
| Alternate reds (UI accents) | `#e63946`, `#ef2c5a`, `#e4003b`, `#ff385c`, `#f3123c`, `#f06673`, `#c5002c` | Tabs, focus rings, CTAs — **confirmed** |
| Primary text | `#1f2a37` | `--Primary-text` — **confirmed** |
| Near-black text | `#111928`, `#111827`, `#111` | Inputs, headings — **confirmed** |
| Muted text | `#4b5563`, `#6b7280`, `#374151`, `#9ca3af` | Subtitles, placeholders — **confirmed** |
| Page / card white | `#fff` | Surfaces — **confirmed** |
| Soft gray bg | `#f3f4f6`, `#f9fafb`, `#f5f5f5` | Search pill bg, section washes — **confirmed** |
| Borders | `#e5e7eb`, `#d1d5db`, `#dee2e6`, `#ced4da`, `#e0e0e0` | Cards, inputs, tabs — **confirmed** |
| Soft pink wash | `#ffe9ed`, `#fee9ef`, `#fff3f9`, `#ffe8e8` | Insight / promo backgrounds — **confirmed** |
| Gold / warm promo | `#fcf1db`, `#f8d67c`, `#fbc574`, `#eab463`, `#c6954d` | Referral cards, gradients — **confirmed** |
| Mint / Trustpilot | `#bcf0da`, `#e9f9f2`, `#31c48d`, `#0e9f6e`, `#b2ffd3` | Trustpilot banner — **confirmed** |
| Hero overlay | `rgba(0,0,0,.2)` | `.overlayBg` — **confirmed** |
| Theme color meta | `#000` / `#222` | `<meta name="theme-color">` |

### Typography

| Role | Font Family | Weight | Letter-spacing | Sizes |
|---|---|---|---|---|
| Body / UI | Whitelabel CSS vars falling back to **system UI stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | 400–600 | default | Fluid: `max(14px,min(2vw,16px))` (feature chips); search `max(14px,min(2.6vw,18px))` |
| Titles | `var(--whitelabel_title_font, inherit)` | 600–700 (inferred for section H2/H4) | default | Section titles ~desktop marketing scale; hero H2/H1 stacked |
| City tile labels | inherit / system | 600 | — | 12px white on photo |
| Tab labels (Hundreds of cities) | system | 600 | — | 14px |

**Font files:** No `@font-face` in fetched homepage CSS chunks — **confirmed**. Branding uses **system fonts + CSS custom properties** for white-label overrides (`--whitelabel_body_font`, `--whitelabel_title_font`). For Skoun, do **not** copy the system-stack look blindly; pick distinctive fonts while keeping hierarchy/weight pattern.

### Spacing System

- **Section padding (desktop):** `48px 80px` (`.subsection-module__subsectionContainer`, insights desktop).  
- **Mid breakpoint (~900–1200):** `48px 40px` or `40px!important`.  
- **Mobile / narrow:** `16px` / `32px 0`.  
- **Gaps:** 8px (pills), 12px (card gutters), 16px (hero content gap, feature chips), 24px (help cards), 32px (subsection gap).  
- **Hero fixed height:** `450px` container — **confirmed from JS** (`style:{height:"450px"}`).  
- **Header spacer:** `62px` when transparent header — **confirmed from JS**.  
- **Fluid sizing:** heavy use of `max()`, `min()`, `clamp`-like patterns e.g. search max-width `max(432px,min(90vw,720px))`.

### Border radius

| Element | Radius |
|---|---|
| Cards / tiles / banners | `8px` |
| Search pill / inputs | `90px`–`999px` (full pill) |
| Feature chips on hero | `8px` |
| Country pills | pill (`activePill` pattern) |
| Carousel dots | `10000px` (capsule) |
| Buttons | `8px` (`.Button-module__btn`) |

### Shadows

- Soft card/dot: `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)`  
- Elevated: `0 4px 20px rgba(0,0,0,.15)`  
- Multi-layer: `0 2px 4px rgba(0,0,0,.18) ×2 + 0 0 0 1px rgba(0,0,0,.08)`  
- Focus ring accent: `inset 0 0 0 4px #ef2c5a`

### Gradients (marketing)

- Soft pink insight: `linear-gradient(184deg,#fbd5d5 -24.74%,#fff 86.77%)` / `220deg` variant  
- Gold referral: `linear-gradient(56deg,#fbc574 4.84%,#ffe1b3 35.93%,#eab463 81.85%,#c6954d 99.26%)`  
- Coral CTA band: `linear-gradient(95deg,#e53863 -9.93%,#ff5771 48.57%,#e53863 105.98%)`  
- Mint Trustpilot: `linear-gradient(115.43deg,#bcf0da 21.36%,#e9f9f2 53.12%,#bcf0da 88.67%)`  
- Shine sweep vars: `--shine-degree: -120deg`; `--shine-effect: linear-gradient(...)`  
- Shimmer skeleton: `linear-gradient(90deg,#f6f7f8 0%,#edeef1 20%,#f6f7f8 40%,#f6f7f8 100%)`

### Responsive Approach

Media queries are **width-driven** (not container queries), with a few orientation rules for tablets:

| Breakpoint band | Role |
|---|---|
| `max-width: 650px` / `640px` / `460px` | Mobile tightening |
| `max-width: 900px` / `min-width: 900px` | Primary mobile/desktop split |
| `900px–1200px` | Tablet / laptop padding reduction |
| `min-width: 1068 / 1260 / 1452 / 1700` | Wide desktop density (main.css) |
| `min-width: 1440` / `1920` | Large monitors |
| Portrait tablet quirks | `712–1180` + `orientation:portrait` |

Desktop homepage is a **dedicated build** (`*.desktop.*`); mobile likely served different HTML/CSS chunks (out of scope for this desktop SSR snapshot).

---

## Page Structure (Top → Bottom)

Observed from HTML module order + `data-testid` landmarks:

1. **Portal / overlays** — `#forPortal`
2. **Hero** (`HeroSectionDesktopStyles`) — full-bleed image, overlay, titles, trust chips, search, recently searched
3. **Insights / stats strip** (`insights`) — Beds / Universities / Cities + Trustpilot widget
4. **Popular Cities** (`popularCitites` + `subsection`) — country pills → city photo tiles + horizontal scroll controls
5. **Thousands of properties** (`ThousandPropertiesNewRails`) — city pills rail + horizontal `CompactInventoryCard` carousels; SEO hidden country/city sections below
6. **Trustpilot reviews band** (`TrustPilotBanner`) — “Trust of 2 Million+ students”
7. **Value props** (`bookYourPerfectAccommodation`) — 4 insight cards
8. **Referral / offers** (`ReferralProgram` cards) — Refer / Scholarship / App cashback
9. **3 easy steps** (`ThreeStepsSection` + `StepCard`)
10. **Partners** (`bestPartners`) + **Partner With Us** / **List With Us** banners
11. **Featured In** (`featuredIn`) logo row
12. **Hundreds of cities** (`HundredsOfCities`) — Cities/Countries tabs + link lists
13. **Need help** (`GetHelpDesktop` + `ContactCard`) — Live Chat, WhatsApp, Email, phone
14. **App download** (`AppDownload`)
15. **Footer** (`FooterDesktop`) — company / discover / support / contact / social / payments

**Header:** Transparent homepage header with optional hidden search — **confirmed from JS** (`transparentBg:!0`, `hideSearchBar:!0`, `parentPage: HOME`). Not fully expanded in the static HTML skeleton start, but CSS includes `Header-module__searchMove` placeholder animation.

---

## Effects Breakdown

| Effect | Implementation | Complexity | Cloneable? | Confidence |
|---|---|---|---|---|
| Hero full-bleed + dark overlay | Absolute `object-fit:cover` image; `rgba(0,0,0,.2)` overlay; content `z-index:2` | Low | Yes | Confirmed CSS |
| Image fade/scale-in | `.Image-module__animateOpacity` starts `opacity:0; transform:scale(.9)` → `.show` clears | Low | Yes | Confirmed CSS |
| Lazy image swap | `IntersectionObserver` sets real `src` when intersecting; shimmer placeholder | Med | Yes | Confirmed JS |
| Skeleton shimmer | `@keyframes Image-module__shimmer` sliding `background-position` | Low | Yes | Confirmed CSS |
| Search placeholder word cycle | CSS `@keyframes searchMove` / `searchMoveEnd` vertical translate on `.animateWords` over `.staticWord` | Med | Yes | Confirmed CSS; cycle text **inferred** from “City / University / Property” UI copy |
| Feature chip shine | `@keyframes SmallFeatures-module__shine` sweeps `left -100% → 100%` + CSS shine vars | Low | Yes | Confirmed CSS |
| Country pill → city grid swap | Active pill class toggles which city tile set is visible (`activePill` / grid) | Med | Yes | Inferred from HTML + classes |
| Horizontal rails | Native `overflow-x: auto`, hidden scrollbars, `HorizontalScroll` / `ThousandProperties…horizontalScrollCr` | Low | Yes | Confirmed CSS; analytics on scroll **confirmed** in sibling offer rail JS |
| Property card image carousel | Transform-based slider (`.carousel-module__slider{transform:translate(-100%)}`); touch `pan-y` | Med | Yes | Confirmed CSS |
| Carousel indicators | Dot → pill width expand (`6px` → `16px` when `.active`, `transition:width .25s`) | Low | Yes | Confirmed CSS |
| Ripple on press | Absolute span + `@keyframes Ripple-module__ripple` scale 0→2 fade | Low | Yes | Confirmed CSS |
| Marquee / ticker | `.ticker-module__tickerContent` `animation: 30s linear infinite scroll`; pause class | Low | Yes | Confirmed CSS |
| Modal zoom enter | `Modal-module__rodal-zoom-enter` scale 0.3 | Low | Yes | Confirmed CSS (global) |
| Tab underline (cities list) | Bottom border color `#e63946` on `.activeTab` | Low | Yes | Confirmed CSS |
| Shortlist heart button | Absolute button on card image (`ShortListButton`) | Low | Yes | Inferred HTML |
| Sticky recently-searched height | Fixed min-height under search to avoid layout jump | Low | Yes | Confirmed CSS |

**Not present (important):** No GSAP ScrollTrigger, no Lenis smooth scroll, no custom cursor, no 3D/image-sequence hero. Polish comes from **CSS transitions + rails + carousels**.

---

## Implementation Details

### 1. Hero composition (confirmed)

```
Container: #section-featured, height 450px, overflow hidden
├── img#hero-image.heroImg (absolute, cover, object-position right center)
├── .overlayBg (absolute, rgba(0,0,0,.2))
└── .content / .contentInner (relative z-index 2, column, gap 16px, ~65% height)
    ├── .heroTitleSection
    │   ├── h2 "Home away from home"
    │   ├── h1 "Book student accommodations near top universities..."
    │   └── SmallFeatures chips: Verified Properties | 24x7 Assistance | Lowest Price Guarantee
    ├── .heroSearchSection → SearchInputDesktop / searchModalDesktop pill input
    │   └── animateContainer + animateWords (cycling placeholder)
    └── RecentlySearched (optional, reserved height)
```

Hero image (preloaded):  
`https://static-assets.amberstudent.com/amber-user-website/static/amberstudent/assets/images/app/assets/1440 - web-min.png?q=90`

JS also references sale/China alternate heroes via `IMAGE_STATIC_URL` (conditional) — **confirmed from chunk 1343**.

### 2. Search placeholder animation (confirmed CSS)

Shared pattern across Header / SearchInput / searchModalDesktop:

```css
@keyframes …__searchMove {
  0%   { opacity: 0; transform: translateY(100%); }
  33.33% { opacity: 1; transform: translateY(0); }
  66.67% { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-100%); }
}
@keyframes …__searchMoveEnd {
  0% { opacity: 0; transform: translateY(100%); }
  33.33% { opacity: 1; transform: translateY(0); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Reveal:** It’s not a JS typewriter — it’s a **stacked word list translated vertically** with timed opacity keyframes. React likely swaps which word has the “end” animation class on the last cycle (**inferred**).

Search chrome: light gray pill (`#f3f4f6`, border `#d1d5db`, radius ~90px, min-height 56px), max width ~720px.

### 3. Image load animation (confirmed)

```css
.Image-module__animateOpacity {
  opacity: 0;
  transform: scale(0.9);
  transition: opacity .25s, transform .25s;
}
.Image-module__animateOpacity.Image-module__show {
  opacity: 1;
  transform: none;
}
```

Lazy path uses `IntersectionObserver` → set src → add `.show` (**confirmed JS**).

### 4. Inventory card rail (confirmed structure + CSS)

- Card outer width **240px**, `margin-right: 12px`, white bg, `1px #d1d5db`, radius 8px.  
- Top: image carousel + shortlist button + optional sold-out tag.  
- Indicators: white translucent dots; active elongates.  
- Bottom: title link, address subtitle, price (`From £X / week`), optional Trustpilot badge / “Student's Choice” style tags.  
- Parent rail: horizontal overflow, scrollbar hidden, city pills above (`pillsActive` vs `pills`).

SEO: large “hidden” country/city property blocks exist in DOM (`Thousands of properties globally-hidden-…`) for crawlability — **confirmed testids**.

### 5. Popular cities (inferred + CSS confirmed)

- Country pills row (UK, Australia, …) with flag/icon images.  
- City tiles `108×108`, radius 8px, image cover, dark label at bottom; hover likely scales image (`transition: all .2s` on img).  
- Right chevron control `#right-carousel`.  

### 6. Trust + conversion blocks (confirmed copy + CSS)

- Trustpilot mint gradient banner.  
- “Book your Perfect Accommodation” — four benefit cards (Instant booking, Lowest price, 24×7, Verified).  
- Referral cards on warm cream/gold backgrounds with CTAs Refer Now / Apply Now / Avail Now.  
- Three steps numbered cards in a horizontal scroll on smaller widths.  
- Partner / List With Us CTA banners.  
- Help: Live Chat, WhatsApp (2 mins reply), Email, phone — WhatsApp is first-class (maps cleanly to Skoun).

### 7. Ripple + ticker (confirmed)

Material-like ripple overlay on clickable surfaces; ticker marquee for promo strips (`30s linear infinite`).

---

## Assets Needed to Recreate (Skoun-ready)

1. **Hero photograph** — Full-bleed student/housing lifestyle, ~1440px wide, right-weighted subject (Amber uses `object-position: right center`). Midjourney/stock: “Beirut apartment interior golden hour students, editorial photography, no logo”.  
2. **Insight icons (3 SVGs)** — Beds / Universities / Cities equivalents (Amber: `homepage-beds.svg`, `homepage-universities.svg`, `homepage-cities.svg`).  
3. **City tile photos** — Square crops for Lebanese areas (Achrafieh, Hamra, Jounieh, Tripoli, etc.), ~216–400px.  
4. **Listing card photos** — Multiple images per listing for carousel (webp).  
5. **Partner / press logos** — Optional; skip or use real local partners only.  
6. **App store badges** — Only if Skoun has apps; else omit AppDownload section.  
7. **UI icons** — Search, chevron, heart/shortlist, WhatsApp, chat, verified check — SVG inline.  
8. **No grain/noise overlay** on Amber homepage — skip unless Skoun brand wants atmosphere elsewhere.

---

## Build Plan

### Recommended Stack (for Skoun web, Expo Router)

- **Framework:** Expo Router `index.web.tsx` + React web components (existing frontend).  
- **Styling:** StyleSheet or CSS Modules / NativeWind — mirror tokens as CSS variables; do not port Amber class names.  
- **Animation:** CSS/`react-native-reanimated` web where needed; prefer CSS keyframes for search cycle, shimmer, ripple.  
- **Rails:** CSS overflow-x or a small carousel helper — no Swiper required.  
- **Data:** Skoun listings/areas APIs; WhatsApp deep links per PRD.

### NPM Packages

```bash
# Prefer existing Expo/RN stack. Only add if missing:
# none strictly required to match Amber motion.
# Optional:
# npm install embla-carousel-react   # if you want polished rails
```

### Section-by-Section Build Order

**Section 1: Design tokens + shell**
- CSS vars for red/neutrals/radii/spacing; page max-width behavior; 80px side padding desktop.

**Section 2: Transparent header**
- Logo (Skoun), primary nav, auth/list CTA; transparent over hero then solid on scroll (**inferred** Amber behavior — verify visually when building).

**Section 3: Hero**
- 450px (or fluid clamp) full-bleed image, overlay, H2 brand line + H1, 3 trust chips with shine, pill search with cycling placeholder (City / University / Area for Skoun).

**Section 4: Insights strip**
- 3 stat cards + optional review widget (skip Trustpilot; use Skoun social proof or WhatsApp reply SLA).

**Section 5: Popular areas**
- Replace countries with Lebanon regions or University vs Area mode toggle (maps to Skoun dual search). City tiles → area tiles.

**Section 6: Featured listings rail**
- Horizontal cards with image carousel, save button, USD monthly price, utility badges (electricity/water/internet) instead of “Student's Choice”/week pricing.

**Section 7: Value props**
- 4 cards — adapt claims to classifieds truth (direct WhatsApp, verified utilities, local areas, student/university proximity) — **do not** claim Amber-style “book with us / paperwork on us / price match” if Skoun doesn’t fulfill them.

**Section 8: How it works (3 steps)**
- Discover → Contact on WhatsApp → Move in (match PRD; no paperwork-handled-by-platform).

**Section 9: List with us / Poster CTA**
- Strong CTA for landlords/brokers (credits/boost) — Amber’s Partner + List banners.

**Section 10: Help + footer**
- WhatsApp / phone / email contact cards; footer columns; skip payment-provider strip if not applicable.

---

## Notes

- **Desktop vs mobile:** This teardown is the **desktop SSR homepage**. Amber ships separate `*.desktop.*` assets; mobile may differ.  
- **White-label hooks:** Many colors/fonts go through `--whitelabel_*` — Amber is built as a multi-brand shell.  
- **Booking marketplace vs classifieds:** Amber is a booking intermediary (payments, guarantees, scholarships). Skoun is a **matchmaking classifieds** product — reuse layout/hierarchy/motion, rewrite claims and CTAs.  
- **SEO DOM weight:** Huge hidden inventory blocks — for Skoun, prefer leaner SSR or paginated SEO pages.  
- **JS analysis limits:** Full HomeDesktop JS graph not exhaustively decoded; carousel swipe physics and search modal open behavior are **partially inferred** from CSS/HTML.  
- **Licensing:** Do not reuse Amber images, logos, Trustpilot business unit embeds, or copy verbatim.

---

## Skoun Adaptation Notes

### Maps cleanly

| Amber pattern | Skoun mapping |
|---|---|
| Hero + search-first homepage | Keep; brand “Skoun” as hero-level signal |
| Pill search with cycling hints | Cycle: Area / University / Landmark (or “Near AUB”) |
| Trust chips under headline | Verified utilities, WhatsApp contact, Student + renter focus |
| Stats strip | Listings count, universities covered, areas covered |
| Popular cities tiles | Lebanese areas / campuses |
| Horizontal listing rails | Featured / newest / near campus |
| Card with photo carousel + save | Same; price in Fresh USD / month |
| WhatsApp in help section | Primary CTA everywhere (PRD) |
| List With Us banner | Poster/landlord acquisition |
| 3-step how-it-works | Adapted to browse → WhatsApp → agree offline |
| Footer IA | Company / support / legal |

### Should change for Lebanon housing

| Amber | Skoun change |
|---|---|
| Global countries / 250+ cities | Lebanon-only; districts + universities |
| “Book” / paperwork / price-match / scholarships | No booking escrow; no false guarantees |
| Weekly £ pricing | Monthly USD + Lebanese utility badges |
| Trustpilot-centric trust | Local proof: reply time, report-listing integrity, real photos |
| App download + payment methods strip | Optional / omit until true |
| Referral £50 / Ambscholar | Only if Skoun has real programs |
| Partner property managers global | Local brokers/dorms; credit monetization |
| System font stack | Distinctive Skoun typography (frontend-design skill) while keeping sizes/weights |
| Red `#ed3a56` brand | Optional inspiration only — Skoun should own its palette (avoid cloning Amber red 1:1 if brand differs) |

### Product-truth constraints (from PRD)

- Platform does **not** handle leases, deposits, or rent payments.  
- Direct WhatsApp/phone connect is the conversion.  
- Dual mode: standard area browse vs university-proximity hub.  
- Utility badges are first-class UI, not optional flair.

---

## Session Scope Confirmation

**Stopped after Amber homepage teardown only.**  
No other Amber pages torn down. No Skoun homepage UI implementation started.

### Natural “next pages” for later sessions (do not analyze yet)

1. https://amberstudent.com/places/search/{city-slug} — search results  
2. Property/inventory detail URLs under `/places/...` or inventory routes linked from cards  
3. https://amberstudent.com/how-it-works  
4. https://amberstudent.com/list — list-with-us  
5. https://amberstudent.com/about  
6. https://amberstudent.com/help or https://amberstudent.com/contact  
7. https://amberstudent.com/blog — content marketing (lower priority)

Suggested next teardown when ready: **search results** (closest to Skoun renter browse), then **listing detail**.
