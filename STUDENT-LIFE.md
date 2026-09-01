# Skoun Campus — Student Life Platform Roadmap

Skoun stays a housing marketplace. This document is the plan to wrap that marketplace in a **student-life product** so students have a reason to open Skoun all year — not only when they need a room.

Housing is the **monetization engine** (landlords, owners, agents pay to list). Campus tools are the **traffic engine** (free utilities that bring students in and keep them coming back). The two products share one account, one brand, and one conversion path: every Campus screen can send a student into housing near their university.

> **Do not rebuild** buying, renting, listing, browse, maps, credits, hosting, or admin. Treat `FEATURES.md` as the housing inventory. This file is only the new Campus surface and the data it needs.

---

## 1. Product thesis

**Problem:** A housing-only app is seasonal. Students disappear between move-in cycles, which makes the audience weaker for paying listers.

**Solution:** A second product inside Skoun — **Campus** — that is useful during registration, midterms, holidays, and everyday campus life. Housing remains the default public site. Campus is one header click away.

**Who it is for**

| Audience | What they get | Why we care |
|----------|---------------|-------------|
| University students in Lebanon | Free tools: tuition estimate, campus info, calendar, student discounts | Daily/seasonal traffic |
| Incoming students / parents | Cost of study + housing near campus in one place | High-intent housing leads |
| Landlords / agents | A larger, returning student audience | Listing demand and pricing power |
| Local businesses | Student-offer distribution | Partnerships and later ad/revenue |

**Scope for this phase of the company**

- Private MEHE-accredited universities in Lebanon only (the catalog already in `institutions` / `universities` seeds: **36 universities, 101 campuses**).
- Public Lebanese University (LU) is out of scope until the private catalog is deep.
- No in-app chat, roommate matching, or payments for tuition. Calculator is informational.

**Two products, three shells**

Skoun already has Housing (renter) and Hosting (poster). Campus is a **third shell**, not a tab mixed into browse.

| Shell | Who | Entry | Status |
|-------|-----|-------|--------|
| Housing | Students + general renters | `/`, Find, listing detail | Built |
| Hosting | Landlords / agents | “Become a host” / “Switch to hosting” | Built |
| Campus | Students (even when not hunting housing) | Header **Campus** button | **To build** |

---

## 2. Dual UI — Housing ↔ Campus

All new student utilities live on a **separate UI**. A persistent header control switches products. Same pattern as Hosting’s “Switch to renting”, but this switch is student-facing and must not be confused with the host switch.

### Header behavior

**On Housing** (`WebTopNav` / renter app header)

- Keep: logo, search, Become a host / Switch to hosting, Login, profile.
- Add: **Campus** button (primary student CTA). Label ideas: `Campus` or `Student tools`.
- Hosting CTAs stay. Campus and Hosting are different switches.

**On Campus** (new `CampusTopNav`)

- Logo + Skoun + a small `Campus` mark so people know which product they are in.
- Primary nav: Home · Universities · Calculator · Calendar · Benefits.
- **Housing** button — `Find a place` / `Switch to housing` — sends them back to browse, preferably pre-filtered to their university if we know it.
- Same Login / profile menu (one Clerk account).
- No listing search pill in this header. Campus search is “university / major / offer”, not “Hamra studio”.

**On Hosting**

- Leave as-is. Optional later: a quiet Campus link in the profile menu only. Hosts should not land in the student-tools home.

### Suggested routes (Expo Router)

New route group `frontend/app/(campus)/`, web-first, shared with the app.

| Path | Screen |
|------|--------|
| `/campus` | Campus home |
| `/campus/calculator` | Tuition & study-cost calculator |
| `/campus/universities` | University directory |
| `/campus/universities/[slug]` | University page (SEO) |
| `/campus/universities/[slug]/[campusSlug]` | Campus page (map, buildings, amenities) |
| `/campus/calendar` | Academic calendar |
| `/campus/benefits` | Student benefits / offers |
| `/campus/benefits/[slug]` | Offer detail |

Housing URLs do not change. Deep links between products are query params, e.g. `/search?universitySlugs=aub` from a Campus CTA “Housing near AUB”.

### Shared chrome to build (Phase 0)

| Component | Role |
|-----------|------|
| `CampusShell` | Layout wrapper (nav + footer), parallel to `WebShell` |
| `CampusTopNav` | Campus header + product switch |
| `ProductSwitchControl` | Shared Housing ↔ Campus button (web + native) |
| `CampusFooter` | Links to calculator, universities, housing, legal |
| `CampusHomePage` | Student-life landing (not the housing Amber homepage) |

Native: add a Campus stack or a header action on renter tabs. Do not replace the housing tab bar with Campus IA. Students who want housing still use Find.

---

## 3. What to build, in order

Order is about **dependency**, not importance. Calculator is the first *student feature* because you asked to start there — but it cannot ship without a place to live (the Campus shell) and a sliver of academic data (university → faculty → major → fees).

```
Phase 0  Campus shell + header switch          ← prerequisite, small
Phase 1  Tuition calculator                    ← you start here (first real feature)
Phase 2  University / campus information       ← deepens the same data model
Phase 3  Academic calendar                     ← return traffic every term
Phase 4  Student benefits                      ← partnerships + habit
Phase 5  Acquisition engine                    ← SEO, analytics, ambassadors
Phase 6  Housing connection polish             ← make Campus actually sell listings
```

Analytics instrumentation (events, not a full growth program) starts in Phase 0 so we are not blind.

**Why not campus encyclopedia first?** A full buildings/parking/cafeterias CMS is months of data work before any student feels a product. The calculator is a complete loop: pick university → see a number → share it → optionally look at housing. It also forces the academic schema everything else will reuse.

**Why calendar before benefits?** Calendar is content we can seed ourselves. Benefits need real partners. Don’t block student tools on BD.

**Why acquisition last as a “phase” but not last in practice?** University pages (Phase 2) *are* SEO. Analytics start immediately. Ambassadors, referrals, and social ops need a product students can actually use.

---

## 4. Phase 0 — Campus shell

**Goal:** Students can leave Housing, land on a Campus home, and come back. Empty states are OK. No fake tools.

### Features

- Header **Campus** / **Housing** switch on web; equivalent control on native.
- Campus home with four destination cards (Calculator live; others “coming” until their phase).
- Remember last product in `localStorage` / AsyncStorage so a returning student who was on Campus doesn’t always bounce to housing home.
- Signed-in users with a campus on their profile (`PATCH /me/campus` already exists) get that university highlighted on Campus home.
- Analytics: `product_switch`, `campus_home_view`.

### Components

| Component | Role |
|-----------|------|
| `CampusShell` | Page chrome |
| `CampusTopNav` | Nav + switch |
| `ProductSwitchControl` | The actual button |
| `CampusHomeHero` | “Student tools for Lebanese universities” |
| `CampusToolGrid` | Cards: Calculator, Universities, Calendar, Benefits |
| `CampusHousingCta` | Persistent “Find a place near {university}” |

### Out of scope here

Visual redesign of Housing. Campus may look different (more editorial / directory, less map-and-cards) but must still feel like Skoun (logo, Ocean/navy tokens, DM Sans).

---

## 5. Phase 1 — Tuition & study-cost calculator *(start here)*

**Goal:** A student can answer “what will this major actually cost me at this university?” for a semester and a year, in USD, with a breakdown they can screenshot or share.

Ship a **vertical slice**: UI + API + seeded fees for a first wave of universities, not all 36 on day one.

### First-wave data (suggested)

Start with the unis students already search for on housing:

1. AUB  
2. LAU (Beirut + Byblos — same institution, campus only if fees differ)  
3. USJ  
4. NDU  
5. USEK  

Then BAU, UOB, LIU, RHU, UA. Then the rest of the private catalog.

### Features

| Feature | Detail |
|---------|--------|
| University picker | From existing `institutions` (logos already exist) |
| Campus picker | Only if that institution has campuses *and* fee tables differ by campus |
| Faculty / school | e.g. Engineering, Business, Arts, Medicine |
| Major / program | Nested under faculty |
| Degree level | Bachelor / Master / (later) MD, PharmD — medicine is often lump-sum, not per credit |
| Billing model | **Per credit hour** *or* **flat per semester** (both exist in Lebanon) |
| Credit load | Default ~15 undergraduate credits; student can change |
| Year vs semester | Toggle; year = fall + spring (summer optional, off by default) |
| Mandatory fees | Registration, technology, lab, insurance, student services — line items, not one blob |
| Optional living costs | Housing (see below), food, transport, books — clearly marked estimates |
| Housing estimate | Pull **live listing stats** near the selected campus (median / “from $X” studio or room). This is the conversion hook, not a fake number |
| Result summary | Big USD total + breakdown + “per month” living slice |
| Compare | Optional v1.5: pin two majors or two universities |
| Share | Copy link with query params (`?uni=aub&major=...`) so it is SEO-indexable later |
| Disclaimer | Official figures change; Skoun is an estimate; source + academic year shown |
| CTA | “See rooms near {campus}” → Housing browse with that `universitySlugs` |

### Calculator UI components

| Component | Role |
|-----------|------|
| `TuitionCalculatorPage` | Screen |
| `CalculatorStepper` or single-page `CalculatorForm` | University → faculty → major → load |
| `InstitutionSelect` | Searchable uni picker (reuse `InstitutionCampusPicker` patterns / logos) |
| `FacultySelect` | School list for selected uni |
| `MajorSelect` | Programs |
| `DegreeLevelToggle` | Bachelor / Master / … |
| `CreditLoadSlider` | Credits per semester |
| `TermToggle` | Semester / academic year / (+ summer) |
| `CostBreakdown` | Line items (tuition, fees, optional living) |
| `CostHeroTotal` | Primary number |
| `HousingCostCard` | Live “housing near campus” estimate + CTA into Housing |
| `LivingCostsPanel` | Food / transport / books toggles |
| `CalculatorDisclaimer` | Source year, last updated |
| `ShareResultButton` | Copy/share |
| `CompareBar` | Later: second column |

### Backend — new module `academic` (or `tuition`)

Do **not** overload the housing `universities` table with fee JSON. Keep campus pins as they are (Housing Hub depends on them). Add academic tables that *reference* `institutions` / `universities`.

| Table | Purpose |
|-------|---------|
| `faculties` | School under an institution (`slug`, `name`, `institution_id`) |
| `programs` | Major under a faculty (`degree_level`, `name`, `slug`, `billing_model`) |
| `tuition_rates` | Credit-hour or flat amount, `currency` (USD), `academic_year` (e.g. 2026-2027) |
| `fee_items` | Named mandatory fees tied to program or faculty |
| `living_cost_presets` | Optional city-level defaults (Beirut vs Jbeil vs Tripoli) — not user-specific |

API (public, read-only):

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/campus/institutions` | Directory; can wrap existing institutions + `popular` |
| GET | `/api/campus/institutions/:slug/programs` | Faculties + majors |
| GET | `/api/campus/programs/:id/costs?year=&credits=&terms=` | Computed breakdown |
| GET | `/api/campus/campuses/:slug/housing-stats` | Median / min rent from live listings within X km (reuse listing distance) |

Admin (Phase 1 can be seed files; admin UI in Phase 2):

- Seed script `tuition-rates.ts` with academic year, source URL, and notes.
- Every rate has `source_url` + `updated_at` so we can defend the numbers.

### Frontend hooks

| Hook | Role |
|------|------|
| `useCampusInstitutions` | Directory |
| `usePrograms(institutionSlug)` | Faculties / majors |
| `useProgramCosts(programId, params)` | Breakdown |
| `useCampusHousingStats(campusSlug)` | Marketplace teaser |

### Admin / ops (minimum)

Until a CMS exists: edit seeds, re-run seed. Track `academic_year`. When a uni publishes new fees, update that year’s rows; keep old years for history.

### Phase 1 done when

- A student can compute semester + year cost for at least one major at each first-wave university.
- Result page shows a live housing teaser for that campus.
- Switch to Housing from the result works with campus preselected.
- Disclaimer + academic year are visible.

---

## 6. Phase 2 — University & campus information system

**Goal:** Skoun is the place you look up “where is the library / which faculty is on this campus / what majors exist” for private universities in Lebanon. This is also the **SEO foundation** (one indexable page per university, then per campus).

Reuse Phase 1 tables. Expand entities. Housing already has institution + campus gate coordinates — that is the map skeleton, not the encyclopedia.

### Information architecture

```
Institution (AUB)                          ← exists
  └ Campus (Ras Beirut)                    ← exists as universities row
       ├ Faculties / schools               ← Phase 1
       ├ Programs / majors                 ← Phase 1
       ├ Buildings
       ├ Amenities (library, cafeteria, parking, sports, clinic, dorm, ATM, chapel…)
       ├ Transport / access notes
       └ Housing nearby (query, not a new table)
```

### Features

| Feature | Detail |
|---------|--------|
| University directory | Search, city filter, popular first (AUB, LAU, USJ…) |
| University page | Overview, campuses, faculties, majors, official site, logo, calculator CTA, housing CTA |
| Campus page | Map (reuse Mapbox + existing gate pin), buildings, amenities, faculties located here |
| Faculty page (optional v2) | Majors list + tuition deep-link |
| Major snippet | Short description, degree, typical credits, “estimate cost” |
| Buildings | Name, type, campus, optional lat/lng, hours if we have them |
| Parking | Lots / street notes / student permit blurb — structured fields, not a blog |
| Libraries | Location, (later) hours |
| Cafeterias / food | Location + hours if known |
| Other POIs | Admin, registrar, clinics, sports, student affairs, dorms |
| Official links | Registrar, admissions, tuition PDF, LMS — outbound |
| Housing block | Same component as calculator: live listings near this campus |
| Empty amenity states | “We don’t have hours yet” — never invent |

Coverage strategy: **complete AUB / LAU / USJ first** (pages people will Google), then breadth across the 36.

### Data tables (add)

| Table | Purpose |
|-------|---------|
| `campus_buildings` | Building on a campus (`type`, name, location nullable, hours JSON) |
| `campus_amenities` | Amenity records; may point at a building |
| `institution_links` | Typed URLs (admissions, tuition, portal) |
| `institution_profiles` | Long copy, founded year, language of instruction, about |

Building `type` enum examples: `academic`, `library`, `cafeteria`, `parking`, `admin`, `sports`, `clinic`, `dorm`, `lab`, `other`.

### Campus directory UI components

| Component | Role |
|-----------|------|
| `UniversityDirectoryPage` | Index |
| `UniversitySearch` | Name / city / major |
| `UniversityCard` | Logo, short name, campus count, city |
| `UniversityProfilePage` | SEO page |
| `CampusProfilePage` | Single campus |
| `CampusMap` | Mapbox; campus pin + building POIs (Housing map is a different component — don’t fork blindly, share helpers) |
| `AmenityList` / `AmenityPin` | Libraries, food, parking, … |
| `BuildingCard` | Detail sheet |
| `FacultyList` / `ProgramList` | Academic index |
| `OfficialLinksRow` | Outbound |
| `CampusHousingRail` | Listings near campus (reuse `ListingCard`) |

### Admin components (real CMS, not demo)

Admin already has `/admin/universities` (registry). Extend it; don’t start a second registry.

| Admin surface | Role |
|---------------|------|
| Institution profile editor | About, links, languages |
| Faculty / program editor | CRUD + attach tuition rates |
| Building / amenity editor | Map pin, type, hours |
| Tuition rate editor | Academic year, billing model, source URL |

Reuse admin dark-mode / neu rules in `admin-dark-mode.mdc`.

### SEO (starts here, continues in Phase 5)

Each university page: unique title/description, slug already on `institutions`, JSON-LD `CollegeOrUniversity`, internal links to calculator + housing. Campus pages similarly. This is the university-specific page layer the acquisition plan needs.

---

## 7. Phase 3 — Academic calendar

**Goal:** “When does fall start at LAU?” / “is Monday a holiday?” — a reason to open Skoun in September, December, and April.

### Features

| Feature | Detail |
|---------|--------|
| National holidays | Lebanese public holidays, shared across unis |
| University calendar | Registration, first day, add/drop, midterms, finals, reading period, graduation |
| Term structure | Fall / Spring / Summer per academic year |
| Filters | University, campus (if calendars differ), event type |
| “My university” | Default from profile campus |
| Subscribe | `.ics` export (high leverage, low UI) |
| Housing cue | Around “term start” and “housing deadline” events, show housing CTA |

Do not scrape student portals. Seed official PDF/web calendars; show `source_url` + last updated.

### Data

| Table | Purpose |
|-------|---------|
| `calendar_years` | e.g. 2026-2027 |
| `calendar_events` | `institution_id` nullable (null = national), `campus_id` nullable, `type`, dates, title |

Event `type` examples: `holiday`, `registration`, `term_start`, `term_end`, `add_drop`, `exams`, `graduation`, `orientation`.

### Components

| Component | Role |
|-----------|------|
| `AcademicCalendarPage` | Main view |
| `CalendarUniversityFilter` | Uni / year |
| `CalendarMonth` / `AgendaList` | Two views; agenda is enough for v1 |
| `EventRow` | Title, date range, type chip |
| `HolidayBadge` | National vs university |
| `AddToCalendarButton` | ICS |
| `CalendarHousingCue` | Conditional CTA |

---

## 8. Phase 4 — Student benefits

**Goal:** Discounts, student plans, and useful subscriptions. This is partnership-led. Build the **catalog product** before promising 50 brands.

### Features

| Feature | Detail |
|---------|--------|
| Offer catalog | Search + category (food, transport, telecom, software, gym, banking, retail, entertainment) |
| Offer detail | What you get, how to redeem, campus/city eligibility, expiry |
| University targeting | All students vs specific unis |
| Featured / new | Home rail on Campus |
| Partner page | Logo, terms |
| Redemption | Code, student email, in-store, link out — keep v1 simple (code or outbound URL) |
| Submit a partnership | Form for businesses (leads for the team) |
| Housing-adjacent offers | e.g. moving, furniture, laundry — sit next to housing CTA |

Student ID verification (email domain `@aub.edu.lb`, etc.) is **v2**. v1 can be honor-system + partner-side checks.

### Data

| Table | Purpose |
|-------|---------|
| `benefit_partners` | Brand, logo, site |
| `benefit_offers` | Title, category, terms, code, dates, `institution_ids[]` or all |
| `benefit_leads` | Business “list your offer” form |

### Components

| Component | Role |
|-----------|------|
| `BenefitsPage` | Catalog |
| `BenefitFilters` | Category, university, city |
| `BenefitCard` | Grid card |
| `BenefitDetail` | Redeem instructions |
| `FeaturedOffersRail` | Campus home |
| `PartnerInquiryForm` | B2B lead |

### Monetization later (not required to launch)

Featured placement for partners. Do not mix this with listing credits. Housing credits stay the core revenue.

---

## 9. Phase 5 — Student acquisition

Product without distribution stays empty; distribution without product is ads for a housing site students ignore. Run these **tracks** once Phase 1 is usable. Some tracks start earlier (noted).

### 5a. University-specific pages & SEO

**Already enabled by Phase 2.** Expand:

| Page type | Example | Intent |
|-----------|---------|--------|
| University hub | `/campus/universities/aub` | “AUB campus info / tuition / housing” |
| Campus hub | `/campus/universities/lau/lau-jbeil` | Local life + housing |
| Calculator landing | `/campus/calculator?uni=aub` | “AUB tuition” |
| Housing+uni (exists) | `/search?universitySlugs=aub` | Keep; interlink from Campus |
| Guides (later) | `/campus/guides/first-year-beirut` | Editorial, thin at first |

Technical: unique titles, canonical URLs, sitemap split (housing vs campus), `FindBrowseSeo`-style FAQ on calculator and uni pages, hreflang only if you add Arabic later.

### 5b. Analytics

From Phase 0, not a separate product:

| Event | Why |
|-------|-----|
| `product_switch` | Housing ↔ Campus |
| `calculator_complete` | Funnel |
| `calculator_to_housing` | The money event |
| `university_page_view` | SEO + content |
| `calendar_view` | Seasonal use |
| `benefit_click` | Partner reporting |
| `housing_from_campus` | Attribution for listers later |

Wire GA4 / existing analytics plus server-side where it matters. Admin later: a simple “Campus” KPI strip (calculator completions, switch-backs to housing). Admin neu already has analytics pages — extend, don’t rebuild.

### 5c. Social-media content

Not an engineering epic. Needs a **content slot** in the product:

- Shareable calculator result card (image/OG).
- Calendar “this week at {uni}”.
- Offer of the week.

Optional: `/campus/share/...` OG templates. Ops: editorial calendar outside the repo.

### 5d. Student ambassadors

| Feature | Detail |
|---------|--------|
| Ambassador apply form | University, year, socials |
| Admin list | Status: applied / active / paused |
| Simple toolkit | Unique link to Campus + housing with `ref=` |
| Perks | Later: credits, featured offer, certificate |

v1 is a form + Notion/admin table. Don’t build a full CRM.

### 5e. Referrals

Student → student. Distinct from ambassador.

| Feature | Detail |
|---------|--------|
| Referral code per user | `skoun.app/r/ahmad` |
| Attribution | Signup + `calculator_complete` or first housing WhatsApp — pick **one** success event and stick to it |
| Reward | v1: waitlist / “we’ll launch rewards”; don’t owe cash before economics are clear |

### 5f. Business partnerships

Same pipeline as Phase 4 inquiry form. Sales process is offline. Product only captures leads and displays live offers.

---

## 10. Phase 6 — Housing connection (always in the background)

Every Campus surface should make paying listings more valuable. Do this incrementally in Phases 1–4, then tighten:

| Hook | Where |
|------|--------|
| Housing stats card | Calculator result, university page, campus page |
| “Find a place near {campus}” | Header on Campus, footer, empty states |
| Term-start calendar cue | Calendar |
| First-year / moving offers | Benefits |
| Profile campus | Already stored — use it as default university everywhere on Campus |

Do **not** auto-redirect Campus users into Housing. The switch is explicit. Conversion is contextual CTAs.

---

## 11. Full feature & component map

### Product features (Campus)

| Area | Feature | Phase |
|------|---------|-------|
| Shell | Housing ↔ Campus header switch | 0 |
| Shell | Campus home + tool grid | 0 |
| Shell | Persist last product | 0 |
| Calculator | Uni / faculty / major / degree / credits | 1 |
| Calculator | Semester & year totals in USD | 1 |
| Calculator | Fee line items + disclaimer | 1 |
| Calculator | Optional living costs | 1 |
| Calculator | Live housing estimate + CTA | 1 |
| Calculator | Shareable URL | 1 |
| Calculator | Compare two programs | 1.5 |
| Directory | All private unis + search | 2 |
| Directory | University SEO page | 2 |
| Directory | Campus page + map + POIs | 2 |
| Directory | Buildings, parking, libraries, cafeterias | 2 |
| Directory | Faculties & majors index | 2 |
| Directory | Official links | 2 |
| Admin | Programs, rates, buildings CMS | 2 |
| Calendar | National holidays | 3 |
| Calendar | Per-uni academic dates | 3 |
| Calendar | ICS export | 3 |
| Benefits | Offer catalog + detail | 4 |
| Benefits | Partner inquiry | 4 |
| Growth | SEO pages / sitemap | 2+5 |
| Growth | Analytics events | 0+5 |
| Growth | Share/OG cards | 5 |
| Growth | Ambassador apply | 5 |
| Growth | Referral codes | 5 |

### Frontend module layout (suggested)

```
frontend/app/(campus)/          screens
frontend/components/campus/     Campus UI
frontend/features/campus/       hooks, types, keys
```

Housing components stay in `components/listings` and `components/web`. Campus may **reuse** `InstitutionLogo`, `ListingCard`, Mapbox helpers, auth modal — it should not import `FindBrowse` as the Campus home.

### Backend modules (suggested)

```
backend/src/modules/campus/
  academic/     faculties, programs, tuition
  directory/    profiles, buildings, amenities
  calendar/     events
  benefits/     partners, offers
  stats/        housing-near-campus aggregates
```

Existing `universities` + `institutions` APIs remain the source of truth for **housing distance**. Campus modules FK to those ids.

---

## 12. Suggested first build (Tuition Calculator)

Do this in order so the first feature is real, not a mock sitting on the housing homepage.

1. **Campus route group + `CampusTopNav` + switch on `WebTopNav`**  
   Empty `/campus` home with one live card: Calculator.

2. **Schema: `faculties`, `programs`, `tuition_rates`, `fee_items`**  
   Migration + seed for AUB, LAU, USJ (one academic year).

3. **Read APIs** for institutions → programs → computed costs.

4. **`TuitionCalculatorPage`**  
   Pickers + breakdown + disclaimer.

5. **`housing-stats` + `HousingCostCard`**  
   Median live rent near campus + “See listings” into existing search.

6. **Native**  
   Same `/campus/calculator` screen in the app (Expo). Header switch on renter chrome.

7. **Then** expand seeds (NDU, USEK, …) before building the encyclopedia.

---

## 13. Explicitly later / not now

| Item | Why wait |
|------|----------|
| Lebanese University (public) | Different structure, huge surface; private catalog first |
| Arabic / RTL | Whole-product, not Campus-only |
| Student email verification | Benefits v2 |
| In-app chat / roommate finder | Already out of housing PRD; don’t smuggle in via Campus |
| Paying tuition through Skoun | Wrong business; we estimate, we don’t bill unis |
| Full campus indoor maps | POI pins are enough |
| Scrapers for tuition PDFs | Legal/fragility; manual seeds + source URLs |
| Rebuilding Housing UI to “look like Campus” | Separate products on purpose |

---

## 14. Success (how we know this is working)

Leading indicators (Campus is useful):

- Weekly returning students who **did not** open a listing.
- Calculator completions per university.
- University page landing traffic from Google.

Lagging indicators (Campus helps the marketplace):

- `calculator_to_housing` and `university_page → search` counts.
- Listing WhatsApp / contact rate attributed to Campus entry.
- Lister willingness to pay because student traffic is less seasonal.

---

## Appendix — existing foundations to reuse

| Already in Skoun | Reuse for Campus |
|------------------|------------------|
| `institutions` + `universities` seeds (36 / 101) | Directory + calculator + maps |
| `InstitutionLogo`, campus picker, `/me/campus` | Defaults and branding |
| Listing distance / University Hub | Housing stats + CTAs |
| `WebTopNav` / `HostTopNav` switch pattern | Product switch |
| Clerk accounts | One login both products |
| Admin `/admin/universities` | Extend into academic CMS |
| `FindBrowseSeo` | Pattern for calculator + uni FAQ |

Housing marketplace = done. Campus = new product beside it, starting with the shell and the **tuition calculator**.
