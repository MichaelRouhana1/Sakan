# Architecture decision: unit-centric listings

## Status

Accepted

## Decision

Skoun models inventory as a **flat** `listings` table: **one row = one rentable offer** (entire apartment, studio, private room, or shared dorm bed). There is **no** property → room-variant → lease-option hierarchy.

## Context

AmberStudent-style PBSA platforms aggregate many room types and lease terms under one building URL. That fits large purpose-built student residences with weekly contracts.

Skoun’s [PRD](../../PRD.md) is different:

- Matchmaking only — the platform does **not** handle leases, deposits, or rent payments.
- Lebanon supply is mostly individual apartments and rooms from private landlords, not 200-bed complexes.
- Pricing and filters are **monthly Fresh USD**, with Lebanon-specific utilities on the listing itself.

## Consequences

### Keep

- Single `listings` row with `listing_type`, `monthly_rent_usd`, utilities (`electricity`, `water`, `wifi_included`, `router_ups`, `elevator_24_7`), `area`, optional `landmark`, and PostGIS `location`.
- Dorms / multi-room buildings: multiple independent listing rows that happen to share a pin.
- Map aggregation is **display-only**:
  1. Coincident collapse (~10m) in `frontend/lib/mapPinGroups.ts` (`MAP_PIN_GROUP_METERS`)
  2. Zoom density clustering via Supercluster in `frontend/lib/mapClusters.ts`
- Detail “more at this location” uses the same ~10m radius via `GET /api/listings/:id/nearby` (PostGIS `ST_DWithin`). Backend constant `COINCIDENT_METERS` must stay in sync with `MAP_PIN_GROUP_METERS`.

### Reject

- Tables or APIs shaped like `properties` → `room_variants` → `lease_options`
- Weekly pricing as the primary unit
- A required `building_id` / address parent for every listing (optional future grouping is out of scope until product needs it)

## Related code

| Area | Path |
|------|------|
| Schema | `backend/src/db/schema/listings.ts`, `enums.ts` |
| Browse / detail API | `backend/src/modules/listings/` |
| Map coincident + clusters | `frontend/lib/mapPinGroups.ts`, `mapClusters.ts` |
| Detail coincident UI | `frontend/components/listings/CoincidentListingsSection.tsx` |
