import type { ListingSort } from "@/components/listings/ListingSortControl";
import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

/**
 * List query filters. Wire format to the API is comma-separated strings
 * (see useListings) — never Axios array serialization.
 */
export type ListingListFilters = {
  areas?: string[];
  universitySlugs?: string[];
  sort?: ListingSort;
  electricity?: ElectricityStatus[];
  water?: WaterStatus[];
  /** When true, require wifi_included. */
  wifiIncluded?: boolean;
  listingTypes?: ListingType[];
  minRentUsd?: number;
  maxRentUsd?: number;
  /** When true, require target_audience = students_only. */
  studentsOnly?: boolean;
  /** boys_only / girls_only — empty = any gender. */
  genderRestrictions?: ("boys_only" | "girls_only")[];
};

export const listingKeys = {
  all: ["listings"] as const,
  lists: () => [...listingKeys.all, "list"] as const,
  list: (filters: ListingListFilters) =>
    [...listingKeys.lists(), filters] as const,
  details: () => [...listingKeys.all, "detail"] as const,
  detail: (id: string) => [...listingKeys.details(), id] as const,
};
