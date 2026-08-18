export type SpaceType = "entire_place" | "private_room" | "shared_room";
export type PropertyType = "apartment" | "studio" | "dormitory" | "house";
export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed";

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
