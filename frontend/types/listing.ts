export type ListingStatus = "draft" | "active" | "archived" | "removed";

export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed"
  | "pbsa_building";

export type TargetAudience = "anyone" | "students_only";

export type GenderRestriction = "anyone" | "boys_only" | "girls_only";

export type ElectricityStatus = "solar" | "generator_24_7" | "scheduled_cuts";

export type WaterStatus = "state_well_24_7" | "tank_delivery";

export type ListingPhoto = {
  id: string;
  url: string;
  sortOrder: number;
  listingId?: string;
  caption?: string;
};

export type PbsaRoomType = {
  id: string;
  name: string;
  category: "studio" | "ensuite" | "shared_room" | "apartment";
  monthlyRentUsd: number;
  availableFrom?: string;
  sizeSqm?: number;
  floor?: string;
  description?: string;
  features: string[];
  photos: ListingPhoto[];
  isAvailable?: boolean;
};

export type LebanonInfrastructure = {
  electricity: {
    status: ElectricityStatus;
    ampLimit?: number;
    solarBackup?: boolean;
    generatorSpecs?: string;
  };
  water: {
    status: WaterStatus;
    hasPumpUps?: boolean;
    tankCapacityLiters?: number;
    notes?: string;
  };
  internet: {
    wifiIncluded: boolean;
    hasFiber?: boolean;
    speedMbps?: number;
    routerUps: boolean;
    routerUpsHours?: number;
  };
};

export type StandardUnitSpecs = {
  floorLevel?: string | number;
  roomCategory?: "private_room" | "entire_apartment" | "flatshare";
  roommateDetails?: {
    count: number;
    genders?: string;
    occupations?: string;
  };
  depositUsd?: number;
  minContractMonths?: number;
};

export type Listing = {
  id: string;
  posterId: string;
  status: ListingStatus;
  listingType: ListingType;
  targetAudience: TargetAudience;
  genderRestriction: GenderRestriction;
  monthlyRentUsd: number;
  electricity: ElectricityStatus;
  water: WaterStatus;
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  area: string;
  landmark: string | null;
  /** WGS84 longitude from ST_X; null when listing has no pin. */
  lng: number | null;
  /** WGS84 latitude from ST_Y; null when listing has no pin. */
  lat: number | null;
  viewCount: number;
  /**
   * Average review score (1–5). Optional until reviews ship end-to-end;
   * omit or leave null when `reviewCount` is 0.
   */
  rating?: number | null;
  /** Total reviews. Badge only shows when this is >= 1. */
  reviewCount?: number | null;
  publishedAt: string | null;
  expiresAt: string | null;
  boostedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  distanceMeters?: number;
  /** Hub: campus slug that produced distanceMeters. */
  nearestCampusSlug?: string;
  /** Hub: resolved display name for nearestCampusSlug (from envelope campuses). */
  nearestCampusName?: string;
  photos: ListingPhoto[];
  coverUrl: string | null;

  // New fields for Amberstudent / PBSA & Lebanon Infrastructure
  isPbsa?: boolean;
  pbsaBuildingName?: string;
  pbsaRoomTypes?: PbsaRoomType[];
  infrastructure?: LebanonInfrastructure;
  unitSpecs?: StandardUnitSpecs;
  description?: string;
  amenities?: string[];
  houseRules?: string[];
  cancellationPolicy?: string;
};

export type CampusMeta = {
  slug: string;
  name: string;
  lng: number;
  lat: number;
};

/** Stable GET /api/listings envelope — campuses is always an array. */
export type ListingsListResponse = {
  data: Listing[];
  campuses: CampusMeta[];
};
