# Skoun — Features & Components Inventory

> Snapshot of what exists in the codebase (Expo frontend + Express backend).  
> Product: Lebanon rental classifieds matchmaking. **Skoun** is the product name; **Sakan** is the legacy / working title (GitHub repo `MichaelRouhana1/Sakan`).
>
> **Docs vs code:** Field inventory and wizard steps must match `createListingSchema` + `listingWizard.ts`; when in doubt, code wins.

---

## Product features (by area)

### Auth & onboarding
| Feature | Status | Where |
|--------|--------|--------|
| Clerk OAuth (Google / Apple / Facebook) | Done | `SkounAuthModal.tsx` |
| Clerk email + password sign-in / sign-up | Done | `SkounAuthModal.tsx` |
| Renter-first; poster role on first publish | Done | `users.repository` provision + `listings.service` promote |
| Browse ↔ host shell switch (nav only) | Done | `SwitchRoleControl.tsx` |
| Clerk JWT on protected API routes | Done | `backend/src/middleware/auth.ts` |
| Local session cache (userId + role) | Done | `lib/session.ts` |
| Campus picker post-login | Done | `InstitutionCampusPicker.tsx`, profile + explore |

**Clerk setup checklist**

1. [Clerk Dashboard](https://dashboard.clerk.com): enable Email + Password, email verification, Google / Apple / Facebook OAuth.
2. Web redirect URLs: `http://localhost:8081` (and production domain).
3. Native OAuth: Expo scheme `skoun` in `frontend/app.json`.
4. `frontend/.env`: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
5. `backend/.env`: `CLERK_SECRET_KEY=sk_test_...`

### Renter — browse & discover
| Feature | Status | Where |
|--------|--------|--------|
| Cities vs University Hub mode | Done | `SearchModeToggle`, renter `index.tsx` |
| Multi-area / multi-campus filters panel | Done | `BrowseFiltersPanel.tsx`, renter Search |
| Property filters (type, rent, utilities, students, gender, `q`, geo radius) | Done | panel + `listListingsQuerySchema` / list repo |
| Sort (newest / lowest price) | Done (Cities) | `ListingSortControl` |
| List ↔ map toggle | Done | `BrowseViewToggle` |
| Renter browse map (pins, campus, walking route + distance) | Done | `ListingBrowseMap` (+ `.web`); public walking-route GET is 90 req / 15 min per IP |
| Co-located pin grouping + picker sheet | Done | `mapPinGroups.ts`, `ListingMapPicker` |
| Map preview card | Done | `ListingMapPreview` |
| Listing cards + distance | Done | `ListingCard` |
| Near-landmark cue | Done | `NearLandmark` |
| Empty states | Done | `EmptyState` |
| Immersive map (filters collapse) | Done | renter `index.tsx` |

### Renter — listing detail & contact
| Feature | Status | Where |
|--------|--------|--------|
| Listing detail | Done | `(renter)/listing/[id].tsx` |
| Photo gallery | Done | `ListingGallery` |
| Utility badges | Done | `UtilityBadges` |
| View count recording | Done | `POST /api/listings/:id/view`, `useRecordListingView` |
| Save / unsave shortlist | Done (synced) | saved module + `useSavedListings` |
| WhatsApp deep-link helper | Done | `lib/whatsapp.ts` |
| WhatsApp / call CTA with poster phone | Done | `ListingDetailBottomBar`, `ListingDetailWeb` — `whatsappNumber` / `contactPhone` from `contactNumbers`; fallback “WhatsApp soon” only when both empty |
| Report listing | Done | Quiet text + `ReportListingSheet`; `POST /api/reports` |

### Renter — saved
| Feature | Status | Where |
|--------|--------|--------|
| Saved tab | Done | `(renter)/(tabs)/saved.tsx` |
| Account-synced saves | Done | `backend/src/modules/saved/*` |
| Local → server import | Done | `savedListingsLocal.ts`, import API |

### Poster — create & manage
| Feature | Status | Where |
|--------|--------|--------|
| 10-step create wizard | Done | `(poster)/create.tsx` — type → location → specs → utilities → rules → photos → pricing → copy → contact → review (`listingWizard.ts`) |
| Space / property / price basis | Done | `CreateStepType`; `listingType` derived, not a primary picker |
| Audience, gender, house rules | Done | `CreateStepRules` — `anyone` / `students_only` / `students_professionals` |
| Map pin + landmarks + GPS | Done | `LocationPicker` (+ `.web`); `locationWkt` required |
| Photo picker (3–15) + upload | Done | `PhotoPickerGrid.shared` `MIN_LISTING_PHOTOS` / `MAX_LISTING_PHOTOS`; `POST …/photos` |
| Poster dashboard (mine, views, expiry) | Done | `(poster)/(tabs)/index.tsx`, `/hosting` |
| Own listing detail + share / archive | Done | `(poster)/listing/[id].tsx` |
| Edit a live listing | Missing | No `PATCH /api/listings/:id`. Host “Edit listing” on a server draft opens detail, not an editor. Admin `ListingEditDialog` is mockStore. |
| Boost listing | Stub | Boost *credits* can be bought. No `POST …/boost`; no host spend CTA. Browse sorts `boostedUntil` first. |
| Credit spend on publish | Done | 1 free live listing; 2nd+ needs post credit; free-slot replacements capped/mo (`listings.service`) |
| Utility legal disclaimer (full PRD) | Done | create utilities step — shown when 24/7 generator, solar, or 24/7 elevator is claimed |
| Post-expiry outcome / renew / archive | Done | Owner route `/hosting/listing/:id/outcome`; lifecycle events; one-credit renewal |
| Expiry notification preferences | Done | Host dashboard + `/api/users/me/notification-preferences` |

### Roommate Finder
| Feature | Status | Where |
|--------|--------|--------|
| Roommate Finder (cards, invites, matches, UI) | Removed | Soft-deleted from app; DB migration `0004_roommate_finder` retained |

### Credits & payments
| Feature | Status | Where |
|--------|--------|--------|
| Credit bundles catalog | Done | `constants/bundles.ts` |
| Buy credits screen | Done | `(poster)/(tabs)/credits.tsx`, `/hosting/credits` |
| Whish Pay checkout | Done | `POST /api/credits/purchase` returns `checkoutUrl`; live API or local mock |
| Auto-grant on verified payment | Done | Whish callbacks + `POST /api/credits/:referenceId/confirm` |
| Admin approve/reject APIs | Done | `/api/admin/transactions/*` (Clerk staff or `x-admin-key`; leftover pending only) |
| Admin console UI | Partial | `/admin` neu desks exist and nav marks `live: true`, but most still read `mockStore`. Institution Registry wired; `/admin/expired` live. Payments `GET /api/admin/transactions` exists, UI unwired. |
| Payment reminders / push | N/A | Replaced by Whish hosted checkout |

### Universities & distance
| Feature | Status | Where |
|--------|--------|--------|
| Universities API + seed | Done | `universities` module + seeds |
| PostGIS distance sort (Hub) | Done | `listings.repository.ts` |
| Format distance for UI | Done | `lib/formatDistance.ts` |

### Campus
| Feature | Status | Where |
|--------|--------|--------|
| Shell + Housing ↔ Campus switch | Done (web) | `CampusShell`, `CampusTopNav`; native `app/campus/_layout.tsx` skips shell |
| Tuition calculator | Done | `/campus/calculator`, `/api/campus/*` |
| Academic calendar | Holidays only | `lebanonHolidays.ts` (2026–2027); no per-uni ICS |
| Student benefits | Catalog + redemption | `/campus/benefits`, `/api/benefits` |
| Universities directory | Not built | Campus home card `live: false`; no `/campus/universities/[slug]` |

### Platform / infra
| Feature | Status | Where |
|--------|--------|--------|
| Health check | Done | `GET /health` |
| Photo local disk storage | Done | `photos.storage.ts` |
| Hourly listing lifecycle job | Done (CLI) | `npm run job:listing-lifecycle`; old archive command remains an alias |
| Expiry push + email | Done (configuration required) | Expo Push + Resend delivery ledger and receipt handling |
| Expiry follow-up admin inbox | Done | `/admin/expired`; manual personal contact actions only |
| Design tokens (Skoun / Lister) | Done | `constants/theme.ts`, `listerTheme.ts` |
| Admin ops tokens | Done | `constants/adminTheme.ts`, `design-system/skoun-admin/` |
| Reduced-motion support | Done | `lib/useReducedMotion.ts` |
| Glass / Apple tab chrome | Done | `components/ui/Glass.tsx` |

---

## Screens (Expo Router)

### Auth
- `/` → redirect to renter browse (guest OK)
- Sign-in / sign-up via `SkounAuthModal` (no role-select screen)

### Renter
- `/(renter)/(tabs)/` — Search (list/map)
- `/(renter)/(tabs)/saved` — Shortlist
- `/(renter)/listing/[id]` — Detail

### Poster
- `/(poster)/(tabs)/` — Dashboard
- `/(poster)/create` — New listing (10-step wizard; not a tab)
- `/(poster)/(tabs)/credits` — Buy credits
- `/(poster)/listing/[id]` — Own listing detail
- `/hosting` — Web host dashboard
- `/hosting/credits` — Buy credits
- `/hosting/analytics` — Host analytics
- `/hosting/listing/:id/outcome` — Post-expiry outcome / renew
- `/hosting/listing/:id/analytics` — Per-listing analytics

### Campus (web shell; native routes exist without `CampusShell`)
- `/campus` — Campus home
- `/campus/calculator` — Tuition calculator
- `/campus/calendar` — National holidays
- `/campus/benefits`, `/campus/benefits/[id]` — Offers + redemption
- Universities directory — **not built**

### Admin (web)
- `/admin` — KPI home (payments + open-reports queues; overview API exists, home still mock-shaped)
- `/admin/payments` — Inbox + history (**UI mock**; `GET /api/admin/transactions` exists)
- `/admin/reports` — Grouped open-report inbox (**mockStore**)
- `/admin/listings` — Search + archive/remove (**mockStore**; admin listing APIs exist)
- `/admin/users` — Search + restrict / unrestrict / ban (**mockStore**; `PATCH /api/admin/users/:id/status` exists)
- `/admin/universities` — Institution Registry (**wired** to `/api/admin/institutions` + campuses)
- `/admin/expired` — Expiry follow-up (**live**)
- `/admin/trust`, `/admin/communication`, `/admin/pricing`, `/admin/analytics`, `/admin/zoning`, `/admin/security`, `/admin/conversion` — neu UI, **mockStore** / demo

### Misc
- `+not-found`
- `+html` (web)

---

## Frontend components

### Listings (`components/listings/`)
| Component | Role |
|-----------|------|
| `BrowseFiltersPanel` | Full-screen L→R filters; cities/campus + type/rent/utilities/students; Apply/Clear |
| `BrowseViewToggle` | List ↔ map switch |
| `SearchModeToggle` | Cities ↔ University Hub |
| `ListingSortControl` | Newest / price ascending |
| `ListingCard` | Feed card (cover, rent, utilities, distance) |
| `ListingBrowseMap` | Native Mapbox Standard browse map (pins, campus, walking route) |
| `ListingBrowseMap.web` | Web/Mapbox browse map parity |
| `ListingMapPreview` | Bottom preview for selected map pin |
| `ListingMapPicker` | Sheet when several listings share one pin |
| `SkounMapPin` | Custom map pin (listing / campus variants) |
| `LocationPicker` | Poster pin drop, landmarks, GPS (native) |
| `LocationPicker.web` | Same for web + `StaticPinMap` |
| `PhotoPickerGrid` | Draft photo grid (3–15) |
| `ListingGallery` | Detail photo gallery |
| `ReportListingSheet` | Quiet report reasons bottom sheet |
| `UtilityBadges` | Electricity / water / Wi‑Fi / elevator badges |
| `NearLandmark` | “Near …” trust cue |

### Lister design system (`components/lister/`)
| Component | Role |
|-----------|------|
| `Screen` (`ListerScreen`) | Screen chrome / layout |
| `Button` (`LButton`) | Primary/secondary actions |
| `Typography` (`LText`) | Display / title / body / caption |
| `EmptyState` | Empty feed / saved / dashboard |
| `Enter` | Enter animation wrapper |
| `StatusChip` | Listing status chip |
| `UtilityPills` | Compact utility chips (poster) |
| `PosterListingCard` | Poster dashboard card |

### Credits
| Component | Role |
|-----------|------|
| Host / poster credits screens | Whish checkout + poll until approved |

### UI primitives (`components/ui/`)
| Component | Role |
|-----------|------|
| `Button` | Generic button (auth shells) |
| `Text` | Generic text |
| `Badge` | Small label badge |
| `Glass` | `GlassSurface`, `GlassChrome`, Apple tab styles |

### Expo boilerplate (legacy)
| Component | Role |
|-----------|------|
| `Themed` | Theme-aware Text/View |
| `StyledText` (`MonoText`) | Monospace text |
| `ExternalLink` | Open external URLs |
| `EditScreenInfo` | Template leftover |
| `useColorScheme` / `.web` | Light/dark hook |
| `useClientOnlyValue` / `.web` | SSR/client value split |

---

## Frontend features (hooks)

### Auth
- `useAuth` — session shell
- `useEnsureSession` — role switch for signed-in users

### Listings
- `useListings` — filtered list (+ campuses envelope)
- `useListing` — single listing
- `useMyListings` — poster’s listings
- `useCreateListing` — create mutation
- `useArchiveListing` — archive mutation
- `useRecordListingView` — increment views
- `uploadListingPhotos` — multipart upload helper
- `normalizeListing` / `normalizeListingsEnvelope` — API → UI types
- `keys` — React Query keys

### Saved
- `useSavedListings` — list / toggle / import local
- `keys` — React Query keys

### Reports
- `useIsReported` / `useReportListing` — report status + submit
- `keys` — React Query keys

### Credits
- `useCredits` — balances
- `useCreatePurchase` — start Whish checkout
- `useWhishCheckout` — open collect URL and poll until approved

### Universities
- `useUniversities` — campus list

---

## Frontend libs & constants

### `lib/`
| Module | Role |
|--------|------|
| `api.ts` | Axios client + Clerk Bearer token |
| `session.ts` | AsyncStorage user session |
| `queryClient.ts` | TanStack Query client |
| `whatsapp.ts` | Listing WhatsApp deep-link builder |
| `format.ts` | General formatting |
| `formatDistance.ts` | Meters → human distance |
| `listingLabels.ts` | Human labels for enums |
| `locationWkt.ts` | WKT POINT helpers |
| `mapPinGroups.ts` | Cluster nearby pins |
| `savedListingsLocal.ts` | Legacy local shortlist |
| `safeBack.ts` | Safe navigation back |
| `useReducedMotion.ts` | a11y motion preference |
| `skounMapbox.web.ts` | Mapbox GL helpers for web maps |
| `mapboxEnv.ts` | Mapbox token aliases, Standard style, static image URL |
| `mapboxWalkingRoute.ts` | Backend walking-route `api.get` client + ok-only L1 cache (Directions run on the server) |
| `features/listings/useWalkingRoute.ts` | Hook for campus→listing walking polyline |

### `constants/`
| Module | Role |
|--------|------|
| `theme.ts` (`Skoun`) | Brand tokens |
| `listerTheme.ts` | Lister UI tokens |
| `Colors.ts` | Expo color scheme leftovers |
| `areas.ts` | Lebanon areas + multi-select caps |
| `areaCoordinates.ts` | Area centroids |
| `landmarks.ts` | Neighborhood landmarks |
| `utilities.ts` | Utility enum ↔ copy |
| `listingWizard.ts` | Create-wizard steps, amenity/highlight options, photo caption presets |
| `bundles.ts` | Credit pack definitions |

### `types/`
- `listing.ts` — Listing, photos, campus meta, enums
- `user.ts` — User / roles / account status
- `credits.ts` — Purchase / transaction types

---

## Backend API

### Users — `/api/users`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/me` | Current user (Clerk JWT); auto-provisions on first request |
| PATCH | `/me/role` | Switch renter ↔ poster |
| PATCH | `/me/campus` | Set study / property campus |
| PATCH | `/me/gender` | Set gender (locked after first set) |
| PATCH | `/me/identity` | Sync name / email / phone from Clerk |
| GET/PATCH | `/me/notification-preferences` | Expiry push/email prefs |
| POST/DELETE | `/me/push-tokens` | Expo push token register / remove |

### Listings — `/api/listings`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Browse (`areas`, `universitySlugs` / `campusId`, `q`, lat/lng/`radiusKm`, electricity, water, wifi, listingTypes, rent, studentsOnly, genderRestrictions, sort) |
| GET | `/mine` | Poster’s listings |
| GET | `/mine/analytics` | Host dashboard totals |
| GET | `/home-popular` | Home rail |
| GET | `/price-guide` | Auth; guidance only (no charge) |
| GET | `/:id` | Detail |
| POST | `/` | Create (auth; publish spend in service). **No `PATCH /:id`.** |
| POST | `/:id/view` | Record view |
| POST | `/photos` | Upload images (max 15) |
| GET | `/:id/nearby` | Nearby listings |
| GET | `/:id/walking-route` | Cached walking polyline |
| GET | `/:id/analytics` | Owner listing analytics |
| GET/POST | `/:id/expiry-decision` | Owner expiry outcome |
| POST | `/:id/renew` | One-credit 30-day renew |
| POST | `/:id/archive` | Owner archive |
| POST | `/copy-suggest` | Title/description suggestions |

### Saved — `/api/saved`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Saved listings |
| POST | `/` | Import local IDs (or bulk — see schemas) |
| GET | `/:listingId` | Is saved? |
| POST | `/:listingId` | Save |
| DELETE | `/:listingId` | Unsave |

### Reports — `/api/reports`
| Method | Path | Notes |
|--------|------|--------|
| POST | `/` | Create report (`listingId` + reason); renter auth; 409 if already reported |
| GET | `/:listingId` | Has current user reported? |

### Universities — `/api/universities`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | All campuses |
| GET | `/:slug` | One campus |

### Credits — `/api/credits`
| Method | Path | Notes |
|--------|------|--------|
| POST | `/purchase` | Create pending Whish checkout; returns `checkoutUrl` |
| GET | `/whish/callback/success` | Provider callback (verify via status API) |
| GET | `/whish/callback/failure` | Provider callback (verify via status API) |
| GET | `/whish/mock/checkout` | Local mock pay page (non-prod without creds) |
| POST | `/whish/mock/complete` | Mock Pay / Fail → settle + redirect |
| POST | `/:referenceId/confirm` | Re-query Whish/mock and grant if paid |
| GET | `/:referenceId` | Owner lookup |

### Admin — `/api/admin` (Clerk staff JWT or `x-admin-key` for scripts)
| Method | Path | Notes |
|--------|------|--------|
| GET | `/overview` | KPI counts |
| GET | `/transactions` | Enriched list (`status`, `referenceId`, `history=1`) |
| GET | `/transactions/pending` | Alias: pending + user join |
| POST | `/transactions/:txId/approve` | Allocate credits; audit actor |
| POST | `/transactions/:txId/reject` | `adminNote` required |
| GET | `/reports?status=open` | Grouped by listing |
| POST | `/reports/listings/:listingId/dismiss` | `adminNote` required |
| GET | `/listings?q=&status=` | Search (limit 50) |
| GET | `/listings/:id` | Photos, reports, poster |
| POST | `/listings/:id/archive` | Active → archived |
| POST | `/listings/:id/remove` | `adminNote` required; no refund |
| POST | `/listings/:id/restore` | Archived → active only |
| GET | `/expiry-followups` | Expiry admin inbox |
| POST | `/expiry-followups/:id/contacted` | Staff marked contacted |
| GET | `/users?q=` | Search (limit 50) |
| PATCH | `/users/:id/status` | `active` / `restricted` / `banned`; ban removes live listings |
| GET | `/audit` | `admin_audit_events` (admin actions only — not host field edits) |
| GET | `/catalog` | Credit bundle catalog |
| GET/POST/PATCH | `/institutions`, `/campuses` | University catalog |

### Campus — `/api/campus`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/institutions` | Directory wrapper |
| GET | `/programs/:id/costs` | Computed tuition breakdown |
| GET | `/campuses/:slug/housing-stats` | Live listing stats near campus |

### Benefits — `/api/benefits`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Offer catalog (redemption nulled if anonymous) |
| GET | `/:id` | Offer detail |
| GET | `/:id/redemption` | Signed-in redemption payload |

### Other
- `GET /health`
- Job: `npm run job:listing-lifecycle` (hourly; `job:archive-expired` is an alias)

---

## Backend modules

| Module | Responsibility |
|--------|----------------|
| `users` | Register, me, free credit on poster signup |
| `listings` | Browse/create/photos/views/archive/renew/expiry/analytics — **no host PATCH** |
| `saved` | Account shortlist |
| `reports` | Listing integrity reports + review status |
| `universities` | Campus catalog + meta |
| `credits` | Purchase / reference lookup |
| `admin` | Payments, reports, listings, users, university catalog, expiry follow-ups, audit |
| `campus` | Institutions, program costs, housing-stats |
| `benefits` | Student offer catalog + redemption |

### Schema tables
- `users`
- `listings` + `listing_photos` (`lookingForRoommate` is a DB column only — not in create wizard/schema)
- `universities`
- `credit_transactions`
- `admin_audit_events` (admin actions; not host field-level edit history)
- `saved_listings`
- `listing_reports`
- Enums: roles, listing types, space/property/price basis, utilities, statuses, report reasons, report review status, etc.

---

## Small shared patterns worth knowing

- **Role-gated apps:** separate `(renter)` and `(poster)` / hosting shells; switch is nav-only  
- **Maps:** Mapbox Standard (`@rnmapbox/maps` native, needs a **dev client**; Mapbox GL JS on web). University mode draws cached walking Directions polylines (straight dashed line if Directions fail).  
- **Design:** Cool bank-blue Skoun tokens (Ocean `#2F6FED`, navy `#121826`, DM Sans via Lister)  
- **Auth today:** Clerk (OAuth + email/password) + verified JWT on API; AsyncStorage caches Skoun user id/role  
- **Monetization today:** Whish Pay checkout (live or local mock); credits grant on verified payment; publish spends a post credit for a 2nd+ live listing (first concurrent live slot is free); boost *purchase* exists, boost *spend* stubbed  
- **Admin:** web `/admin` (Clerk staff) + `x-admin-key` for scripts; Institution Registry + expiry inbox live; most other neu desks still `mockStore` despite `live: true`  

---

## Explicitly not built (PRD out of scope or backlog)

- In-app chat  
- Roommate Finder (removed from product; `lookingForRoommate` column unused by create; legacy DB tables may remain)  
- Card payment gateways  
- Real OTP/JWT — N/A; auth is Clerk JWT (email/OAuth), not phone OTP  
- Host `PATCH /api/listings/:id` / edit live listing (PLANNED policy in `PRD.md` / `NEXT.md`)  
- Report auto-restrict / broker flagging (reports store only)  
- Admin desks wired to Postgres (except Institution Registry and expiry follow-up)  
- Boost spend (`POST …/boost`)  
- Listing reviews (`demoListingRating()` in `normalizeListing.ts` still hashes fake scores)  
- Arabic / RTL  
