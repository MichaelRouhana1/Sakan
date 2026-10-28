export type SpaceType = "entire_place" | "private_room" | "shared_room";
export type PropertyType = "apartment" | "studio" | "dormitory" | "house";
export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed";
export type UnitType = "whole_apartment" | "private_room" | "shared_bed";
export type GenderRule = "any" | "male_only" | "female_only";

/** Keep browse `listing_type` filters valid while wizard stores split axes. */
export function deriveListingType(
  spaceType: SpaceType,
  propertyType: PropertyType,
): ListingType {
  if (spaceType === "private_room") return "private_room";
  if (spaceType === "shared_room") return "shared_dorm_bed";
  if (propertyType === "studio") return "studio";
  return "entire_apartment";
}

export function deriveUnitType(spaceType: SpaceType): UnitType {
  if (spaceType === "shared_room") return "shared_bed";
  if (spaceType === "private_room") return "private_room";
  return "whole_apartment";
}

export function deriveGenderRule(
  genderRestriction: "anyone" | "girls_only" | "boys_only",
): GenderRule {
  if (genderRestriction === "girls_only") return "female_only";
  if (genderRestriction === "boys_only") return "male_only";
  return "any";
}
