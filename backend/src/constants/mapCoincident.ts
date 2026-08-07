/**
 * Listings within this distance share one visual map pin and appear as
 * "more at this location" siblings on detail.
 * Must match frontend `MAP_PIN_GROUP_METERS` in `frontend/lib/mapPinGroups.ts`.
 */
export const COINCIDENT_METERS = 10;

/** Cap siblings returned by GET /api/listings/:id/nearby. */
export const NEARBY_LISTINGS_LIMIT = 12;
