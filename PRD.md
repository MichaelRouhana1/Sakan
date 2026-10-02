# Product Requirement Document (PRD)

**Product name:** Skoun  
**Legacy / working title:** Sakan. Older copy and the GitHub repo (`MichaelRouhana1/Sakan`) still use Sakan; the name in the app and remaining product docs is **Skoun**.

> **Docs vs code:** Field inventory and wizard steps must match `createListingSchema` (`backend/src/modules/listings/listings.schemas.ts`) + `listingWizard.ts` (`frontend/constants/listingWizard.ts`). When in doubt, code wins.

## Project Name: Skoun — Version 1.0

### 1. Document Overview & Objective

The goal is to build a lightweight, highly localized classifieds directory mobile application that connects residential renters and student renters with landlords, dorm operators, and real estate brokers in Lebanon.

The app serves strictly as a matchmaking bridge. The platform does not handle lease agreements, secure security deposits, process rental payments, or mediate tenant disputes.

- **Monetization:** Pay-per-post for commercial entities/brokers (after an initial free listing allowance) and a premium "boost" credit tier for all property posters.
    
- **Target Audience:** General renters and university students in Lebanon (free access); residential landlords, dorm owners, and real estate brokers (paid access).
    

### 2. User Personas & Roles

Accounts are dual-capable. Users are not forced into a single role at signup.

- **Default (Renter):** New accounts start as renters. They browse, filter, and save listings for free. Can toggle between standard city searches and student-centric university location views. Connects directly with posters via phone or WhatsApp.
    
- **Landlord / Poster:** Host capabilities unlock when the user publishes their first listing (DB role promoted to poster). Until then, users may open the create-listing flow and host dashboard via navigation only. Switch between browse and host shells is a UI navigation control — it does not change the stored role by itself.
    
- **Credits & dashboard:** Posters purchase posting credits, create property listings, select target audiences, and manage active/expired posts via a personal dashboard.
    

### 3. Core Feature Requirements

#### 3.1 User Authentication & Onboarding

- **Sign-Up/Login Method:** Clerk authentication — email + password and OAuth (Google, Apple, Facebook). No phone-number OTP login (WhatsApp or SMS).
    
- **Roles (no forced pick):** There is no post-verification role gate. Users land in the renter experience after sign-in. Hosting is entered voluntarily (list a place / host dashboard). Poster role is granted on first successful publish.
    

#### 3.2 The Renter Experience (The Buyer Side)

- **Dual Search Architecture:** The home screen features a prominent, easy-to-use toggle at the top of the interface:
    
    - **Standard Mode (Default):** A location selector based on Lebanese districts and cities (e.g., Achrafieh, Mar Mikhael, Jounieh, Tripoli, Saida). Results default to sorting by newest or lowest price.
        
    - **University Hub Mode:** A student-centric mode where the user selects a specific university campus (e.g., AUB, LAU Jbeil, USJ Huvelin, LU Fanar). The feed instantly reorganizes to display listings ordered by closest linear distance to that specific campus gate.
        
- **Browse filters (renter):** `areas`, `universitySlugs` / `campusId`, free-text `q`, geo pin + `radiusKm`, `electricity`, `water`, `wifiIncluded`, `listingTypes`, `minRentUsd` / `maxRentUsd`, `studentsOnly`, `genderRestrictions`. Wire format is comma-separated query params (`listListingsQuerySchema`).
    
- **Lebanese Utility Badges:** Every listing card must visually display status badges for critical Lebanese infrastructure metrics:
    
    - **Electricity:** Solar Power ☀️ | 24/7 Generator (Ishtirak Included) ⚡ | Scheduled Cuts 🔌.
        
    - **Water:** 24/7 State/Well Water 💧 | Tank Delivery Required 🚛.
        
    - **Internet:** Wi-Fi Included 🌐 | Router UPS Backup Enabled 🔋 (stays on during outages).
        
    - **Building Infrastructure:** 24/7 Working Elevator 🛗.
        
- **Direct Connect Button:** A prominent action button on every listing detail page. Tapping it triggers a deep-link directly into a native WhatsApp chat with the poster containing a pre-filled template message: _"Hi, I saw your listing for the [Property Type] in [Area] on Skoun. Is it still available?"_ Phone numbers come from the listing’s `contactNumbers` (legacy `whatsappNumber` / `contactPhone` are derived).
    
- **Listing Integrity Systems:**
    
    - A **"Report Listing"** control on every post allowing users to flag "Fake", "Inaccurate Utilities", or "Already Rented" properties.
        
    - An automated system to flag or restrict accounts that receive high volumes of user reports (aimed at spammy brokers or phantom listings). **Not built** — reports store only; admin Reports UI is mock.
        

#### 3.3 The Landlord / Poster Experience (The Seller Side)

- **Create listing — 10-step wizard** (`frontend/app/(poster)/create.tsx`, titles in `listingWizard.ts`):

    `type` → `location` → `specs` → `utilities` → `rules` → `photos` → `pricing` → `copy` → `contact` → `review`

    `listingType` (`entire_apartment` | `studio` | `private_room` | `shared_dorm_bed`) is **derived** from `spaceType` + `propertyType` (`deriveListingType.ts`). It is not a primary picker.

    | Step | Host sets |
    |------|-----------|
    | type | `spaceType`, `propertyType`, `priceBasis` |
    | location | `area`, `buildingName`, `addressLine`, `locationWkt`, `landmark`, `primaryCampusId` |
    | specs | `bedrooms`, `beds`, `bathrooms`, `maxOccupancy`, `floorNumber`, `furnishingType`, `areaSqm`, `hasElevator`, `elevator24_7` |
    | utilities | `electricity` (+ `generatorAmperes`, cut windows, `hasSolar`, `generatorIncluded`), `water`, `wifiIncluded`, `routerUps`, `conciergeIncluded`, `cookingGasIncluded`, `amenities[]` |
    | rules | `targetAudience` (`anyone` \| `students_only` \| `students_professionals`), `genderRestriction`, `smokingPolicy`, `petsPolicy`, `guestsPolicy`, `quietHours` |
    | photos | `photoUrls` **3–15** (+ optional captions) |
    | pricing | `monthlyRentUsd` (Fresh USD, whole dollars), `securityDepositUsd`, `leaseTerm`, `availableFrom`, `paymentModality` |
    | copy | `title`, `description`, `highlightTags` |
    | contact | `listingPosterRole`, `contactName`, `contactNumbers` (Lebanese phones; legacy `contactPhone` / `whatsappNumber` derived) |
    | review | `cardBadges` (browse-card pills + order); `publishNow` |

    **Not host-set / system:** `status`, `posterId`, `viewCount`, `publishedAt`, `expiresAt`, `boostedUntil`, timestamps. `lookingForRoommate` exists on the listings table but is **not** in the create wizard or `createListingSchema`.

    Map pin drop is required (`locationWkt` POINT inside Lebanon). Landmarks remain an optional neighborhood cue.

- **Listing Management Dashboard:** Active listings, view counts, days until automatic expiration, local create-wizard draft checkpoints, and post-expiry outcome / renew / archive. There is **no** host `PATCH /api/listings/:id` and no live-listing edit UI (host “Edit listing” on a server draft opens the listing detail, not an editor; admin edit dialogs are mock).
    
- **Verification Protection Policy:** When checking premium infrastructure boxes (24/7 generator, solar / `hasSolar`, or 24/7 elevator), posters are shown an explicit in-app legal disclaimer: _"Inaccurate utility claims will result in your post being permanently removed without a refund."_
    
- **PLANNED — Edit a live listing** (not Done; document so create vs edit stay distinct):

    - Edit UI is a **prefilled sectioned / single-screen** editor, **not** the linear create wizard.
    - **Soft** fields editable anytime, no credit: rent/deposit/terms, utilities/amenities, house rules, copy/tags/badges, photos, contacts.
    - **Hard / structural** fields editable only for **24 hours after `publishedAt`**, then locked server-side. After that, a new unit = archive + create + credit.
    - **HARD:** `spaceType`, `propertyType`, `listingType`, `targetAudience`, `genderRestriction`, `bedrooms`, `beds`, `bathrooms`, `maxOccupancy`, `floorNumber`, `areaSqm`, `area`, `locationWkt` (material move), `landmark`, `addressLine`, `buildingName`, `primaryCampusId`.
    - **SOFT:** rent/deposit/terms, utilities/amenities, house rules, copy/tags/badges, photos, contacts.
    - **Audit:** `admin_audit_events` logs **admin** actions only. Field-level host edit history is **not built yet**.
    

### 4. Monetization & Payment Workflows

#### 4.1 The Credit/Token System

The backend tracks a simple balance integer for every Poster account called "Credits."

- **1 Post Credit** = Allows 1 standard listing to go live on the platform for exactly 30 days.
    
- **1 Boost Credit** = Pins an active listing to the top of its respective City or University Hub search feed for 7 consecutive days. Browse already sorts `boostedUntil` first. **Spend is not built** — there is no `POST …/boost` that sets `boostedUntil` and decrements `boostCredits`.
    
- **Publish spend (built):** One concurrent live listing is free. A 2nd+ live listing spends a post credit. Free-slot replacements are capped per calendar month (`FREE_SLOT_REPLACEMENTS_PER_MONTH` = 2). Promoting a renter → poster can grant 1 post credit if the account has none (`users.repository.updateRole`).
    

#### 4.2 Whish Pay checkout

Poster credit packs are sold through Whish Pay (wallet checkout), not cash slips or admin receipt review.

**1. Initiate purchase — In-app.**

Poster selects a credit bundle and taps **Pay with Whish**. The backend creates a `credit_transactions` row (`status: pending`) and asks Whish for a hosted checkout URL.

**2. Pay in Whish.**

The app opens the Whish collect URL (or a local mock page in development without merchant credentials). The poster completes payment in Whish.

**3. Verify and auto-grant.**

Whish calls the platform success/failure callback. The backend **does not trust the callback query string**: it re-queries Whish payment status, checks amount, then atomically marks the transaction approved and adds post/boost credits. A signed-in `POST /api/credits/:referenceId/confirm` covers missed webhooks (including localhost).

**4. Manual admin approve** remains only as an escape hatch for leftover pending rows, not the happy path.

Local development without `WHISH_CHANNEL` / `WHISH_SECRET` uses the same pending → confirm → grant path against a mock checkout page.

### 5. Technical Requirements & Edge Cases

#### 5.1 Listing Expiration & Data Maintenance

To prevent user frustration from stale, already-rented listings left on the platform:

- All active posts carry a hard **30-day expiration timer**.
    
- At day 25, the hourly lifecycle job (`npm run job:listing-lifecycle`) sends an Expo Push and optional Resend email once per cycle: the listing is approaching expiry. The server does **not** send WhatsApp; `/admin/expired` can open `wa.me` after a staff click.
    
- If unrenewed by day 30, the listing automatically switches to an "Archived" state and is hidden from all public search feeds. Owners can renew with one post credit (`POST /api/listings/:id/renew`) or confirm an outcome on `/hosting/listing/:id/outcome`.
    

#### 5.2 Distance Calculations

- The system will maintain a static, pre-populated database table storing the exact Latitude and Longitude coordinates of major Lebanese university campus gates.
    
- When a user activates the University Hub mode, the backend orders listings with PostGIS `ST_Distance` between the listing geography pin and the chosen campus coordinates, returning the distance in meters or kilometers. Walking-route fallbacks may use a haversine estimate if Directions fail.
    

### 6. Out of Scope (Version 1.0)

The following features are strictly excluded from the initial release to maximize speed-to-market and lower initial development costs:

- In-app roommate matching or social discovery notice boards.
    
- In-app messaging/chat infrastructure (delegated entirely to native phone calls and WhatsApp).
    
- Direct online credit card processing or international payment gateway integrations.
