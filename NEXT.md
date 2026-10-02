# What to work on next

Snapshot of **missing or incomplete** product work in the current codebase (Sep 2026). Ordered by launch impact, not by how large the ticket is.

**Suggested next slice:** finish the in-progress profile identity work, then either **wire admin to live APIs** (if the goal is operating housing) or **build the university directory** (if the goal is finishing Campus — it is the only Campus home card still marked not live).

---

## 0. Finish what is already open locally

Uncommitted work on this machine — land or discard before starting a new epic:

- **Profile identity** — web profile can edit name / email / phone / password; backend `PATCH /api/users/me/identity` syncs from Clerk. Native `profile.tsx` still lacks that panel.
- **Find / nav polish** — `FindFilterDropdown`, campus CSS, listing carousel, university campus filter, top nav.
- **Tmp assets** — `_tmp_*.pdf`, `_tmp_creperie/`, extract txt. Do not ship.

---

## 1. Housing — still incomplete vs the PRD

These are v1 marketplace gaps. Campus can wait; posters and ops cannot.

### High — posters cannot run a listing after publish

| Item | Status | Why it matters |
|------|--------|----------------|
| **Edit a live listing** | Done | Owner `PATCH /api/listings/:id` never spends a post credit. Soft fields (rent, utilities, rules, copy, photos, contact) anytime. Hard fields (unit type, audience, beds/floor/size, area, pin, address, campus) only for 24h after `publishedAt`, then `409 STRUCTURAL_FIELDS_LOCKED`. Pin jitter threshold is 25m (`STRUCTURAL_PIN_MAX_METERS`), separate from the 10m map grouping. Host UI is a sectioned edit screen. Admin `ListingEditDialog` remains mockStore. |
| **Renew after 30 days** | Done | Owner outcome screen, append-only cycle history, and atomic one-credit renewal are live. |
| **Boost spend** | Stub | Boost *credits* can be bought and stored. There is no `POST …/boost` that sets `boostedUntil` and decrements `boostCredits`. Browse already sorts boosted listings first. |
| **Day-25 still-available nudge** | Done (configuration required) | Hourly lifecycle job sends Expo Push and optional Resend email once per cycle. |
| **Utility legal disclaimer** | Done | Create utilities step shows PRD copy when 24/7 generator, solar (`hasSolar`), or 24/7 elevator is claimed. Scheduled cuts alone does not. |

### Medium — contact, integrity, monetization ops

| Item | Status | Why it matters |
|------|--------|----------------|
| **Report auto-restrict / broker flag** | Missing | Renters can report. Nothing auto-restricts accounts with a high report volume. Admin Reports UI is mock. |
| **Payment drop-off reminders** | N/A | Replaced by Whish Pay checkout (auto-grant on verified payment). |
| **Forgot password** | Missing | Clerk email+password is live; auth modal has no reset path. |
| **Listing reviews** | Fake | Cards show Amber-style ratings from `demoListingRating()` in `normalizeListing.ts`. No reviews table or API. Hide the badge or ship real reviews — do not launch with hashed fake scores. |

### WhatsApp contact

**Done.** Detail CTAs use `listing.whatsappNumber` / `contactPhone` (`ListingDetailBottomBar`, `ListingDetailWeb`, `lib/whatsapp.ts`). Numbers are stored on `contactNumbers` and derived to the legacy columns at create. “WhatsApp soon” is only the empty-phone fallback.

---

## 2. Admin console is almost all demo

`/admin` looks complete. Almost every desk still reads `mockStore` / `MOCK_*`, even though the nav marks them `live: true`.

**Actually wired to the API:** Institution Registry (`/admin/universities` → `/api/admin/institutions` + campuses).

**UI only (mutations do not hit Postgres):**

| Desk | File |
|------|------|
| Payments inbox | `paymentsSource.ts` (comment: `GET /api/admin/transactions` exists, UI not wired) |
| Users | `mockUsers.ts` |
| Listings review / takedown | `listingsSource.ts` (Change history panel fetches live `GET /api/admin/listings/:id/audit`) |
| Reports | `reportsSource.ts` |
| Expiry follow-up | Live at `/admin/expired`; delivery history and staff-initiated personal contact actions |
| Trust / KYC queue | `trustSource.ts` (Veriff webhook TODO) |
| Comms / broadcasts / feedback | `communicationSource.ts` |
| Pricing / promo codes | `pricingSource.ts` (catalog is hardcoded `BUNDLE_CATALOG`) |
| Analytics / conversion funnel | `analyticsSource.ts`, `conversionSource.ts` |
| Zoning | `zoningSource.ts` |
| Security / RBAC | `securitySource.ts` (“demo only · not enforced”) |

You cannot restrict a real user or take down a real listing from this UI today. Credit purchases settle via Whish (or the local mock) without the admin inbox. Backend admin routes for payments / reports / listings / users **do exist** — the work is wiring the neu desks, not inventing APIs.

**Best next admin slice:** Payments (money) → Reports + listing takedown (trust) → Users restrict/ban → Expired renew. Leave analytics, pricing CMS, zoning, and RBAC for later.

---

## 3. Campus — built vs still missing

| Tool | Status |
|------|--------|
| Shell + Housing ↔ Campus switch | Done (web). Native campus routes exist but skip `CampusShell` / footer. |
| Persist last product | Helper writes on switch (`setSkounProduct`); `getSkounProduct` is unused so restore is not wired. |
| Tuition calculator | Done for seeded unis (AUB, LAU, USJ, …) + housing-stats CTA + shareable query params. |
| Academic calendar | **Holidays only** (`lebanonHolidays.ts`, years 2026–2027). No per-uni registration / add-drop / exams, no ICS. |
| Student benefits | Catalog + detail + signed-in redemption API. No partner “list your offer” form, no admin CMS for offers. |
| **Universities directory** | **Not built.** Campus home card is `live: false`. No `/campus/universities/[slug]` pages, buildings, amenities, or SEO uni pages. |
| Compare two programs | Not built (calculator v1.5). |
| Analytics events | Not built (`product_switch`, `calculator_complete`, `calculator_to_housing`, …). |
| Homepage ticker | `InsightsMarquee` still says “Campus tools coming soon” even though Campus is live. |

**If Campus is the next product bet:** build the university directory (Phase 2 in `STUDENT-LIFE.md`). Calculator without uni pages has weak SEO and no place for buildings / majors beyond the form.

**If Campus is “good enough for now”:** skip directory; only fix the ticker copy, native shell, and last-product restore.

Later Campus (do not start yet): partner inquiry, ambassadors, referrals, student email-domain verification, Lebanese University (public), Arabic/RTL.

---

## 4. Trust & production (before real users)

| Item | Status |
|------|--------|
| **Veriff identity** | Not started. Checklist still in `TODO.md`. Admin Trust is a mock badge tray. Decide the gate (before first listing vs before contact unlock) before building. |
| Clerk **live** keys + production redirect URLs | Still test keys. See `ENV to change.md`. |
| Migration `0008_drop_email_registration.sql` | Listed as not run on all environments. |
| Photo storage | Local disk (`UPLOAD_DIR`). Need object storage before more than one API box. |
| Download app button | Placeholder QR + non-clickable store badges. Amber GIF assets. Fine until there is a store listing. |
| Sitemap / JSON-LD / unique meta | None. Housing and Campus pages are not SEO-ready. |
| Arabic / RTL | Not started. Whole-product, not a Campus-only task. |

---

## 5. Cleanup (when touching those files)

- Drop unused user columns: `password_hash`, `phone`, `phone_verified_at` (auth is Clerk).
- Pre-existing frontend TS issues (map / carousel) noted in `TODO.md`.
- Expo leftovers: `EditScreenInfo`, `Themed`, `Colors.ts`.
- Stale docs: `PRD.md` / `FEATURES.md` / `TODO.md` were aligned to code (Sep 2026). Keep wizard fields in lockstep with `createListingSchema` + `listingWizard.ts`.
- Native vs web profile: keep identity editing in one component used on both, or native will lag again.

---

## Explicitly not next

Do **not** pick these up unless the product decision changes:

- In-app chat
- Roommate Finder (removed)
- Card / international payment gateways
- Paying tuition through Skoun
- Full indoor campus maps
- Scraping university tuition PDFs

---

## Recommended sequences

**A — Launch housing (operators + posters)**  
1. Finish profile identity (open branch).  
2. Wire admin Payments to `/api/admin/transactions`.  
3. Wire admin Listings + Reports + Users to existing admin APIs.  
4. Boost spend endpoint + host CTA.  
5. Hide fake ratings (`demoListingRating` in `normalizeListing.ts`).  
6. Production Clerk keys + object storage.  
(Day-25 nudge and credit auto-grant on Whish payment are already live.)

**B — Grow Campus (student traffic)**  
1. Finish profile identity.  
2. University directory + SEO pages (AUB / LAU / USJ first).  
3. Per-uni academic calendar + ICS.  
4. Partner inquiry form + benefits CMS.  
5. Calculator/Campus analytics events.  
6. Fix homepage “coming soon” ticker.

Pick **A** if the next milestone is real listings and cash. Pick **B** if the next milestone is students opening Skoun when they are not hunting a room.
