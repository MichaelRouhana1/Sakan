import type { PriceBasis, SpaceType } from "@/types/listing";

/** Rent unit follows rental type — never chosen separately. */
export function priceBasisForSpaceType(spaceType: SpaceType): PriceBasis {
  if (spaceType === "shared_room") return "per_bed_month";
  if (spaceType === "private_room") return "per_room_month";
  return "per_unit_month";
}

export function monthlyRentFieldLabel(spaceType: SpaceType | null | undefined): string {
  if (spaceType === "shared_room") return "Monthly rent (USD), per bed";
  if (spaceType === "private_room") return "Monthly rent (USD), per room";
  return "Monthly rent (USD), whole unit";
}

/** Public card / listing copy. Returns null when inventory is unknown. */
export function bedsAvailableLabel(
  available: number | null | undefined,
  total: number | null | undefined,
): string | null {
  if (available == null || total == null) return null;
  if (available === 0) return "Full";
  return `${available} of ${total} beds available`;
}

/** Toast after a host beds quick-edit. */
export function bedsAvailableToast(
  available: number,
  total: number,
): string {
  if (available === 0) return "Marked full.";
  return `${available} of ${total} beds available.`;
}
