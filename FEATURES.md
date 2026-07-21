# Skoun — Features & Components Inventory

> Snapshot of what exists in the codebase (Expo frontend + Express backend).  
> Product: Lebanon rental classifieds matchmaking (Sakan / Skoun).

---

## Product features (by area)

### Auth & onboarding
| Feature | Status | Where |
|--------|--------|--------|
| Phone screen shell | Stub (skip) | `frontend/app/(auth)/phone.tsx` |
| OTP screen shell | Stub (skip) | `frontend/app/(auth)/otp.tsx` |
| Role select (renter vs poster) | Done | `frontend/app/(auth)/role-select.tsx` |
| Dev session (throwaway register) | Done (temp) | `features/auth/useEnsureSession.ts` |
| Local session storage | Done | `lib/session.ts` |
| Header auth (`x-user-id` / `x-user-role`) | Stub | `backend/src/middleware/auth.ts` |
| Real WhatsApp/SMS OTP + JWT | Missing | — |

### Renter — browse & discover
| Feature | Status | Where |
|--------|--------|--------|
| Cities vs University Hub mode | Done | `SearchModeToggle`, renter `index.tsx` |
| Multi-area / multi-campus filters panel | Done | `BrowseFiltersPanel.tsx`, renter Search |
| Property filters (type, rent, utilities, students, gender) | Done | panel + `listListingsQuerySchema` / list repo |
| Sort (newest / lowest price) | Done (Cities) | `ListingSortControl` |
| List ↔ map toggle | Done | `BrowseViewToggle` |
| Renter browse map (pins, campus, dotted line + distance) | Done | `ListingBrowseMap` (+ `.web`) |
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
| Edit / renew / archive UX | Done (archive + roommate withdraw) | `POST /api/listings/:id/archive` |
| Looking for roommate toggle | Done | create + `PATCH …/looking-for-roommate` |

### Roommate Finder v1
| Feature | Status | Where |
|--------|--------|--------|
| Verified phone gate (`phoneVerifiedAt`) | Done (stub OTP) | users + `requirePhoneVerified` |
| User gender (private, same-gender filter) | Done | `PATCH /api/users/me/gender` |
| Looking cards (seeker) | Done | `/api/roommate/cards*` |
| Teaser DTO (no gender/phone/photos) | Done | `roommate.serializers.ts` |
| Holder seeker browse + required invite note | Done | `/api/roommate/seekers`, `POST /invites` |
| Accept / Decline only | Done | `/invites/:id/accept\|decline` |
| Match unlock WhatsApp + end-match copy | Done | matches + FE |
| Blocks / reports | Done | `/api/roommate/blocks`, `/reports` |
| Nearby count + soft-launch areas | Done | `/stats/nearby`, `roommateLaunch.ts` |
| Renter Roommates tab | Done | `(renter)/(tabs)/roommates` |
| Poster Find roommate | Done | `(poster)/find-roommate/[listingId]` |
| Post-view Looking prompt | Done | `LookingPromptSheet` |
| In-app chat / opposite-gender / real OTP | Out of scope v1 | — |

### Credits & payments
| Feature | Status | Where |
|--------|--------|--------|
| Credit bundles catalog | Done | `constants/bundles.ts` |
| Buy credits screen | Done | `(poster)/(tabs)/credits.tsx` |
| Pending purchase + reference ID | Done | `POST /api/credits/purchase` |
| WhatsApp support CTA for receipt | Done | `PendingPaymentCard` |
| Admin approve/reject APIs | Done (API only) | `/api/admin/transactions/*` |
| Admin console UI | Missing | — |
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
| Reduced-motion support | Done | `lib/useReducedMotion.ts` |
| Glass / Apple tab chrome | Done | `components/ui/Glass.tsx` |

---

## Screens (Expo Router)

### Auth
- `/` → redirect to auth
- `/(auth)/phone`
- `/(auth)/otp`
- `/(auth)/role-select`

### Renter
- `/(renter)/(tabs)/` — Search (list/map)
- `/(renter)/(tabs)/saved` — Shortlist
- `/(renter)/(tabs)/roommates` — Roommate Finder hub
- `/(renter)/listing/[id]` — Detail (+ Looking prompt)
- `/(renter)/roommates/looking-card` — Create/edit Looking card
- `/(renter)/roommates/invite/[id]` — Accept / Decline
- `/(renter)/roommates/match/[id]` — Unlock WhatsApp / end
- `/(renter)/roommates/guidelines`

### Poster
- `/(poster)/(tabs)/` — Dashboard
- `/(poster)/(tabs)/create` — New listing (+ roommate toggle)
- `/(poster)/(tabs)/credits` — Buy credits
- `/(poster)/listing/[id]` — Own listing detail
- `/(poster)/find-roommate/[listingId]` — Browse seekers + invite

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
| `ListingBrowseMap` | Native browse map (pins, campus, polyline, distance badges) |
| `ListingBrowseMap.web` | Web/Leaflet browse map parity |
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
- `useEnsureSession` — register throwaway user for role

### Listings
- `useListings` — filtered list (+ campuses envelope)
- `useListing` — single listing
- `useMyListings` — poster’s listings
- `useCreateListing` — create mutation
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
| `api.ts` | Axios client + auth headers |
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
| `skounLeaflet.web.ts` | Leaflet helpers for web maps |

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
| POST | `/register` | Phone + role; poster gets 1 free post credit |
| GET | `/me` | Current user + credit balances |

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

### Admin — `/api/admin` (`x-admin-key`)
| Method | Path | Notes |
|--------|------|--------|
| GET | `/transactions/pending` | Pending payments |
| POST | `/transactions/:txId/approve` | Allocate credits |
| POST | `/transactions/:txId/reject` | Reject |

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
| `reports` | Listing integrity reports (store only) |
| `universities` | Campus catalog + meta |
| `credits` | Purchase / reference lookup |
| `admin` | Approve/reject credit transactions |

### Schema tables
- `users`
- `listings` + `listing_photos`
- `universities`
- `credit_transactions`
- `saved_listings`
- `listing_reports`
- Enums: roles, listing types, utilities, statuses, report reasons, etc.

---

## Small shared patterns worth knowing

- **Role-gated apps:** separate `(renter)` and `(poster)` tab trees after role select  
- **Maps:** `react-native-maps` native; Leaflet on web  
- **Design:** Mediterranean Skoun tokens (Jade Glaze `#4FB79F`, brass campus cues, DM Sans via Lister)  
- **Auth today:** not real OTP — headers + AsyncStorage only  
- **Monetization today:** purchase + admin APIs exist; publish does not spend credits; boost UI stubbed  

---

## Explicitly not built (PRD out of scope or backlog)

- In-app chat / roommate matching  
- Card payment gateways  
- Real OTP/JWT  
- Working WhatsApp contact (phone exposure)  
- Report auto-restrict / broker flagging (reports store only)  
- Admin web UI  
- Boost spend  
- Renew / day-25 notifications  
- WhatsApp Bridge for landlords  
- Arabic / RTL  
