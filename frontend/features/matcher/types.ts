import type {
  ElectricityStatus,
  GenderRestriction,
  ListingType,
  PriceBasis,
} from "@/types/listing";

export type Importance = "prefer" | "required";
export type Answer<T> = { value: T; importance: Importance };
export type MatchLocation = {
  kind: "campus" | "area";
  label: string;
  areas?: string[];
  campusId?: string;
  slug?: string;
  center?: { lat: number; lng: number };
  radiusKm?: number;
};
export type MatcherPreferences = {
  version: 1;
  type?: Answer<ListingType[]>;
  budget?: Answer<{ min: number | null; max: number | null }>;
  location?: Answer<MatchLocation>;
  gender?: Answer<Exclude<GenderRestriction, "anyone">[]>;
  power?: Answer<ElectricityStatus[]>;
  wifi?: Answer<true>;
};
export type Dimension = Exclude<keyof MatcherPreferences, "version">;
/** Facts present on the wire, captured before legacy presentation defaults. */
export type MatchFacts = {
  rent: number | null;
  type: ListingType | null;
  area: string | null;
  gender: GenderRestriction | null;
  power: ElectricityStatus | null;
  wifi: boolean | null;
  lat: number | null;
  lng: number | null;
  priceBasis: PriceBasis | null;
  reportedUtilityKeys?: string[];
};
export type MatchDetail = {
  dimension: Dimension;
  label: string;
  weight: number;
  credit: number;
  known: boolean;
  required: boolean;
  description: string;
};
export type MatchPresentation = {
  score: number;
  top: boolean;
  reasons: string[];
  details: MatchDetail[];
  knownCount: number;
  answeredCount: number;
  priceBasis: PriceBasis | null;
};
export const EMPTY_PREFERENCES: MatcherPreferences = { version: 1 };
export const DIMENSIONS: Dimension[] = [
  "type",
  "budget",
  "location",
  "gender",
  "power",
  "wifi",
];
