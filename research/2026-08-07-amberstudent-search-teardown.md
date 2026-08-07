# Amber Student — Search / Browse page teardown (Skoun adaptation)

> Source: Amber SearchDesktopV2 (`/places/search/{city}`) — screenshots (list, grid, map split) + Ctrl+U HTML for Bath + CSS chunks `main`, `858`, `6019`.  
> Assets cached under `research/_amber-search-*.css`.  
> Skoun brand: cerulean `#2F6FED`, deep `#121826`, mist grounds — DM Sans. Lebanon only.

---

## 1. Layout modes (desktop)

| Mode | Structure |
|------|-----------|
| **List (default rail)** | Header → filter pills → breadcrumbs/H1 + List\|Grid toggle → **main column (~65%)** listing cards + **right rail (~280–320px)** map CTA thumbnail + USP accordions → FAQ / SEO / Nearby → footer |
| **Grid** | Same chrome; results become 2–3 column cards; right rail stays |
| **Map open** | Filter bar stays; **left pane ~35–40%** scrollable list (compact cards); **right pane ~60–65%** sticky full-height map; Close Map control; hide FAQ/SEO/footer chrome while map focused (or keep footer below fold) |

Mobile: Amber collapses to hamburger + compact search; Skoun web can keep stacked filters + full-width list with map as full-screen overlay.

---

## 2. Chrome inventory (Amber → Skoun)

### Header
- Logo left · **centered search pill** · utility links (Support, Login, menu)
- Skoun: keep `WebTopNav` Find / Saved / List; add **inline search** (city / area / university) on Find route

### Filter bar (sticky under header)
Amber pills: Smart Filters · Filters · Sort · University · Budget · Move in · Stay · Room Type · Amenities · Bills · Clear All  

**Skoun pills (Lebanon truth):**
- Filters (opens full panel)
- Sort
- Area (city / neighbourhood — not country)
- University
- Budget (USD / month)
- Room type
- Utilities (electricity / water / Wi‑Fi)
- Clear all

Drop: Smart Filters wand, Move-in month, Stay duration, Instant Booking, No Visa No Pay, Bills-as-Amber-marketing unless mapped to real utility fields.

### Results header
- Breadcrumbs: `Home / Lebanon / {City}` (no UK-style country→state chain beyond Lebanon)
- H1: `Student Accommodations in **{City}** | Showing **N** places`
- Optional short SEO blurb + Read more
- View toggle: List | Grid

### Listing card (list)
Horizontal / stacked: image carousel + save · title · address · distance to area/uni · amenity chips · rating if we have real data · **From $X / mo** · primary CTA = View / WhatsApp (not Book)

### Listing card (grid)
Vertical image-top card; same data density trimmed

### Right rail (non-map)
1. Map preview + **Explore On Map** (cerulean outline)
2. USP accordions — rewrite for Skoun:
   - Verified contact paths / WhatsApp-first
   - Utility clarity (electricity · water · Wi‑Fi)
   - Lebanon-local areas & universities
   - No fake Trustpilot / price-match / 24×7 booking desk claims

### Map mode
- Cluster-capable markers (Leaflet already in `FindMapPane`)
- Price or pin markers; Close Map
- List pane sync: hover/select highlights pin

### Below fold (list/grid only)
- Pagination or infinite scroll (keep current load-more if present)
- FAQ accordion (city-scoped copy for Beirut etc.)
- Nearby: tabs **Areas · Universities · Listings** (not Cities worldwide)
- Footer via `WebShell`

---

## 3. CSS / interaction tokens (from Amber CSS, remapped)

| Amber pattern | Approx | Skoun |
|---------------|--------|-------|
| Primary CTA | `#ed3a56` / `#f3123c` | `#2F6FED` |
| Page ground | `#f7f7f7` / white | `#EEF1F6` |
| Card surface | white + soft shadow | `#FFFFFF` + soft shadow |
| Filter pill | 1px `#e5e7eb`, radius ~8–999 | mist border, radius 999 or 10 |
| Body text | `#111928` / `#374151` | `#121826` / `#5B6570` |
| Positive badge | `#0e9f6e` | use sparingly; prefer utility pills in mist/cerulean |

Typography: Amber system sans → **DM Sans** only.

---

## 4. Data / routing (Skoun)

- Route: `/(renter)/(tabs)/` web → `FindBrowse`
- Query: `?area=`, university, filters via existing `BrowseFiltersValue` + `useListings`
- Areas: `LEBANON_AREAS` — cities/neighbourhoods only
- Price: **USD / month**

---

## 5. Explicit non-goals (do not clone)

- Multi-country / state breadcrumbs beyond Lebanon
- Instant booking, Visa policies, weekly £ pricing
- Trustpilot widgets / “Lowest Price Guaranteed” copy
- Amber Smart Filters AI product
- Download-app / language switcher clutter in header

---

## 6. Implementation map

| File | Role |
|------|------|
| `components/web/FindBrowse.tsx` | Orchestrates list / grid / map split |
| `components/web/FindFilterBar.tsx` | Sticky horizontal pills |
| `components/web/ListingResultCard.tsx` | `variant: 'grid' \| 'list'` |
| `components/web/FindMapPane.tsx` | Side pane → flexible split height |
| `components/web/FindBrowseSidebar.tsx` | Explore On Map + USP |
| `components/web/FindBrowseSeo.tsx` | FAQ + Nearby (Lebanon) |
| `WebShell` / `WebTopNav` | Optional search pill; full-bleed when map open |
