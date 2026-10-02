/** Draft keys that match the API hard list. `pin` stands in for `locationWkt`. */
export const HARD_DRAFT_FIELDS = [
  "spaceType",
  "propertyType",
  "targetAudience",
  "genderRestriction",
  "bedrooms",
  "beds",
  "bathrooms",
  "maxOccupancy",
  "floorNumber",
  "areaSqm",
  "area",
  "pin",
  "landmark",
  "addressLine",
  "buildingName",
  "primaryCampusId",
] as const;

export const STRUCTURAL_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Material pin move. Distinct from map grouping at 10m. */
export const STRUCTURAL_PIN_MAX_METERS = 25;

export function isWithinStructuralWindow(
  publishedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return false;
  return now < published + STRUCTURAL_EDIT_WINDOW_MS;
}

export function hardDraftFieldSet(): ReadonlySet<string> {
  return new Set(HARD_DRAFT_FIELDS);
}
