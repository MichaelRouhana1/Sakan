export type SpaceType = "entire_place" | "private_room" | "shared_room";
export type UnitType = "whole_apartment" | "private_room" | "shared_bed";
export type PriceBasis = "per_unit_month" | "per_bed_month" | "per_room_month";

export function priceBasisForSpaceType(spaceType: SpaceType): PriceBasis {
  if (spaceType === "shared_room") return "per_bed_month";
  if (spaceType === "private_room") return "per_room_month";
  return "per_unit_month";
}

export function priceBasisForUnitType(unitType: UnitType): PriceBasis {
  if (unitType === "shared_bed") return "per_bed_month";
  if (unitType === "private_room") return "per_room_month";
  return "per_unit_month";
}
