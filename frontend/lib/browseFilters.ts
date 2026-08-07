import type { ListingSort } from "@/components/listings/ListingSortControl";
import type { SearchMode } from "@/components/listings/SearchModeToggle";
import type { BrowseFiltersValue } from "@/components/listings/BrowseFiltersPanel";
import type { ListingListFilters } from "@/features/listings/keys";

/** Shared filter → API param mapping for browse (native + web). */
export function toListFilters(
  mode: SearchMode,
  browse: BrowseFiltersValue,
  sort: ListingSort,
): ListingListFilters {
  const property: ListingListFilters = {
    electricity:
      browse.electricity.length > 0 ? browse.electricity : undefined,
    water: browse.water.length > 0 ? browse.water : undefined,
    listingTypes:
      browse.listingTypes.length > 0 ? browse.listingTypes : undefined,
    wifiIncluded: browse.wifiIncluded ? true : undefined,
    minRentUsd: browse.minRentUsd ?? undefined,
    maxRentUsd: browse.maxRentUsd ?? undefined,
    studentsOnly: browse.studentsOnly ? true : undefined,
    genderRestrictions:
      browse.genderRestrictions.length > 0
        ? browse.genderRestrictions
        : undefined,
  };
  const areas = browse.areas.length > 0 ? browse.areas : undefined;

  if (mode === "standard") {
    return { areas, sort, ...property };
  }
  if (browse.universitySlugs.length > 0) {
    return {
      universitySlugs: browse.universitySlugs,
      areas,
      ...property,
    };
  }
  return { areas, sort, ...property };
}
