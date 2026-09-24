import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

export type BrowseFiltersValue = {
  areas: string[];
  universitySlugs: string[];
  /** Institution kept while campus is still being chosen. */
  institutionSlug: string | null;
  /** Campus UUID for geo hub browse. */
  campusId: string | null;
  radiusKm?: number | null;
  /** Free-text keyword search. */
  q: string | null;
  electricity: ElectricityStatus[];
  water: WaterStatus[];
  /** true = Wi‑Fi included only; false = any. */
  wifiIncluded: boolean;
  listingTypes: ListingType[];
  minRentUsd: number | null;
  maxRentUsd: number | null;
  /** true = students_only only; false = any audience. */
  studentsOnly: boolean;
  /** Empty = any gender; otherwise gender_restriction IN (...). */
  genderRestrictions: ("boys_only" | "girls_only")[];
};

export const EMPTY_BROWSE_FILTERS: BrowseFiltersValue = {
  areas: [],
  universitySlugs: [],
  institutionSlug: null,
  campusId: null,
  q: null,
  electricity: [],
  water: [],
  wifiIncluded: false,
  listingTypes: [],
  minRentUsd: null,
  maxRentUsd: null,
  studentsOnly: false,
  genderRestrictions: [],
};
