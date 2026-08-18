import type { ListingType, PropertyType, SpaceType } from "@/types/listing";

export function deriveListingType(
  spaceType: SpaceType,
  propertyType: PropertyType,
): ListingType {
  if (spaceType === "private_room") return "private_room";
  if (spaceType === "shared_room") return "shared_dorm_bed";
  if (propertyType === "studio") return "studio";
  return "entire_apartment";
}
