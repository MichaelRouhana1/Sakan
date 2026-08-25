# Skoun — Features & Components Inventory

> Snapshot of what exists in the codebase (Expo frontend + Express backend).  
> Product: Lebanon rental classifieds matchmaking (Sakan / Skoun).

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
| Property filters (type, rent, utilities, students, gender) | Done | panel + `listListingsQuerySchema` / list repo |
| Sort (newest / lowest price) | Done (Cities) | `ListingSortControl` |
| List ↔ map toggle | Done | `BrowseViewToggle` |
| Renter browse map (pins, campus, walking route + distance) | Done | `ListingBrowseMap` (+ `.web`) |
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
| WhatsApp CTA with poster phone | Stub (phone null) | listing detail `getPosterPhone` |
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
| Multi-step create wizard | Done | `(poster)/(tabs)/create.tsx` |
| Audience / type / rent / utilities | Done | create flow |
| Map pin + landmarks + GPS | Done | `LocationPicker` (+ `.web`) |
| Photo picker (1–8) + upload | Done | `PhotoPickerGrid`, `uploadListingPhotos`, `POST …/photos` |
| Poster dashboard (mine, views, expiry) | Done | `(poster)/(tabs)/index.tsx` |
| Own listing detail + share | Done | `(poster)/listing/[id].tsx` |
| Boost listing | Stub (“coming soon”) | poster listing detail |
| Credit spend on publish | Done | 1 free live listing; 2nd+ needs post credit; free-slot replacements capped/mo |
| Utility legal disclaimer (full PRD) | Missing / soft copy only | create utilities step |
| Edit / renew / archive UX | Done | `POST /api/listings/:id/archive` |

### Roommate Finder
| Feature | Status | Where |
|--------|--------|--------|
| Roommate Finder (cards, invites, matches, UI) | Removed | Soft-deleted from app; DB migration `0004_roommate_finder` retained |

### Credits & payments
| Feature | Status | Where |
|--------|--------|--------|
| Credit bundles catalog | Done | `constants/bundles.ts` |
| Buy credits screen | Done | `(poster)/(tabs)/credits.tsx` |
| Pending purchase + reference ID | Done | `POST /api/credits/purchase` |
| WhatsApp support CTA for receipt | Done | `PendingPaymentCard` |
| Admin approve/reject APIs | Done | `/api/admin/transactions/*` (Clerk staff or `x-admin-key`) |
| Admin console UI | Done (web Phase 2) | `/admin` — payments, reports inbox, listing review, users/listings search |
| Payment reminders / push | Missing | — |

### Universities & distance
| Feature | Status | Where |
|--------|--------|--------|
| Universities API + seed | Done | `universities` module + seeds |
| PostGIS distance sort (Hub) | Done | `listings.repository.ts` |
| Format distance for UI | Done | `lib/formatDistance.ts` |

### Platform / infra
| Feature | Status | Where |
|--------|--------|--------|
| Health check | Done | `GET /health` |
| Photo local disk storage | Done | `photos.storage.ts` |
| Archive expired listings job | Done (CLI) | `npm run job:archive-expired` |
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
- `/(poster)/(tabs)/create` — New listing
- `/(poster)/(tabs)/credits` — Buy credits
- `/(poster)/listing/[id]` — Own listing detail

### Admin (web)
- `/admin` — KPI home (payments + open-reports queues)
- `/admin/payments` — Inbox + history
- `/admin/reports` — Grouped open-report inbox
- `/admin/listings` — Search + archive/remove
- `/admin/listings/[id]` — Listing review (dismiss / archive / remove / restrict / ban)
- `/admin/users` — Search + restrict / unrestrict / ban
- `/admin/universities` — Institution Registry (demo)
- `/admin/zoning` — Geographic Zoning (demo)

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
| `PhotoPickerGrid` | Draft photo grid (max 8) |
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
| `PendingPaymentCard` | Pending Whish/OMT + WhatsApp support CTA |

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
- `useCreatePurchase` — start pending purchase

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
| `mapboxWalkingRoute.ts` | Mapbox Directions walking client + cache |
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

### Listings — `/api/listings`
| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Browse (area(s), university slug(s), sort) |
| GET | `/mine` | Poster’s listings |
| GET | `/:id` | Detail |
| POST | `/` | Create (auth poster) |
| POST | `/:id/view` | Record view |
| POST | `/photos` | Upload images |

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
| POST | `/purchase` | Create pending Whish/OMT tx |
| GET | `/:referenceId` | Lookup transaction |

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
| GET | `/users?q=` | Search (limit 50) |
| PATCH | `/users/:id/status` | `active` / `restricted` / `banned`; ban removes live listings |
| GET/POST/PATCH | `/institutions`, `/campuses` | University catalog |

### Other
- `GET /health`
- Job: archive expired listings

---

## Backend modules

| Module | Responsibility |
|--------|----------------|
| `users` | Register, me, free credit on poster signup |
| `listings` | CRUD-ish browse/create, photos, views, archive |
| `saved` | Account shortlist |
| `reports` | Listing integrity reports + review status |
| `universities` | Campus catalog + meta |
| `credits` | Purchase / reference lookup |
| `admin` | Payments, reports, listings, users, university catalog |

### Schema tables
- `users`
- `listings` + `listing_photos`
- `universities`
- `credit_transactions`
- `admin_audit_events`
- `saved_listings`
- `listing_reports`
- Enums: roles, listing types, utilities, statuses, report reasons, report review status, etc.

---

## Small shared patterns worth knowing

- **Role-gated apps:** separate `(renter)` and `(poster)` / hosting shells; switch is nav-only  
- **Maps:** Mapbox Standard (`@rnmapbox/maps` native, needs a **dev client**; Mapbox GL JS on web). University mode draws cached walking Directions polylines (straight dashed line if Directions fail).  
- **Design:** Cool bank-blue Skoun tokens (Ocean `#2F6FED`, navy `#121826`, DM Sans via Lister)  
- **Auth today:** Clerk (OAuth + email/password) + verified JWT on API; AsyncStorage caches Skoun user id/role  
- **Monetization today:** purchase + admin APIs exist; publish does not spend credits; boost UI stubbed
- **Admin:** web `/admin` (Clerk staff) + `x-admin-key` for scripts; reports/listings/users + payments inbox  

---

## Explicitly not built (PRD out of scope or backlog)

- In-app chat  
- Roommate Finder (removed from product; legacy DB tables may remain)  
- Card payment gateways  
- Real OTP/JWT — N/A; auth is Clerk JWT (email/OAuth), not phone OTP  
- Working WhatsApp contact (phone exposure)  
- Report auto-restrict / broker flagging (reports store only)  
- Admin Phase 2+ (reports queue, user restrict, listing takedown, campus map UI)  
- Boost spend  
- Renew / day-25 notifications  
- Arabic / RTL  
