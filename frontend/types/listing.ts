export type ListingStatus = "draft" | "active" | "archived" | "removed";

export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed"
  | "pbsa_building";

export type TargetAudience =
  | "anyone"
  | "students_only"
  | "students_professionals";

export type SpaceType = "entire_place" | "private_room" | "shared_room";
export type PropertyType = "apartment" | "studio" | "dormitory" | "house";
export type PriceBasis = "per_unit_month" | "per_bed_month" | "per_room_month";
export type FurnishingType = "furnished" | "semi" | "unfurnished";
export type SmokingPolicy = "inside" | "balcony_only" | "no";
export type PetsPolicy = "yes" | "cats_only" | "no";
export type GuestsPolicy = "yes" | "no" | "restricted";
export type LeaseTerm =
  | "semester"
  | "months_6"
  | "months_9"
  | "year"
  | "flexible";
export type PaymentModality = "monthly" | "semester" | "quarterly";
export type ListingPosterRole = "landlord" | "student_sublet" | "agent";

export type GenderRestriction = "anyone" | "boys_only" | "girls_only";

export type ElectricityStatus = "solar" | "generator_24_7" | "scheduled_cuts";

export type WaterStatus = "state_well_24_7" | "tank_delivery";

export type ListingPhoto = {
  id: string;
  url: string;
  sortOrder: number;
  listingId?: string;
  caption?: string | null;
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
    cutsStart?: string | null;
    cutsEnd?: string | null;
    hoursOn?: number | null;
    windows?: { start: string; end: string }[];
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
  spaceType?: SpaceType;
  propertyType?: PropertyType;
  priceBasis?: PriceBasis;
  targetAudience: TargetAudience;
  genderRestriction: GenderRestriction;
  monthlyRentUsd: number;
  securityDepositUsd?: number;
  leaseTerm?: LeaseTerm;
  availableFrom?: string | null;
  paymentModality?: PaymentModality;
  electricity: ElectricityStatus;
  electricityCutsStart?: string | null;
  electricityCutsEnd?: string | null;
  electricityHoursOn?: number | null;
  electricityCutWindows?: { start: string; end: string }[];
  water: WaterStatus;
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  hasElevator?: boolean;
  hasSolar?: boolean;
  generatorAmperes?: number | null;
  generatorIncluded?: boolean;
  conciergeIncluded?: boolean;
  cookingGasIncluded?: boolean;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  maxOccupancy?: number;
  furnishingType?: FurnishingType;
  floorNumber?: number;
  areaSqm?: number | null;
  smokingPolicy?: SmokingPolicy;
  petsPolicy?: PetsPolicy;
  guestsPolicy?: GuestsPolicy;
  quietHours?: boolean;
  title?: string | null;
  highlightTags?: string[];
  listingPosterRole?: ListingPosterRole;
  contactName?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  contactNumbers?: {
    kind: "mobile" | "landline";
    prefix: string;
    subscriber: string;
    e164: string;
    calls: boolean;
    whatsapp: boolean;
  }[];
  addressLine?: string | null;
  buildingName?: string | null;
  primaryCampusId?: string | null;
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
