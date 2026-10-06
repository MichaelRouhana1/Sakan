const PARKING_AMENITY = "parking";

/**
 * Parking starts included in the rent the moment the amenity turns on.
 * Turning the amenity off clears the flag. An explicit toggle wins.
 */
export function nextParkingIncludedInRent(input: {
  previousAmenities: readonly string[];
  nextAmenities: readonly string[];
  previousIncluded: boolean;
  explicit?: boolean;
}): boolean {
  if (input.explicit !== undefined) return input.explicit;
  const had = input.previousAmenities.includes(PARKING_AMENITY);
  const has = input.nextAmenities.includes(PARKING_AMENITY);
  if (!had && has) return true;
  if (had && !has) return false;
  return input.previousIncluded;
}
