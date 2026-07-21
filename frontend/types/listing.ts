export type ListingStatus = "draft" | "active" | "archived" | "removed";

export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed";

export type TargetAudience = "anyone" | "students_only";

export type GenderRestriction = "anyone" | "boys_only" | "girls_only";

export type ElectricityStatus = "solar" | "generator_24_7" | "scheduled_cuts";

export type WaterStatus = "state_well_24_7" | "tank_delivery";

export type ListingPhoto = {
  id: string;
  url: string;
  sortOrder: number;
  listingId?: string;
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
  lookingForRoommate: boolean;
  area: string;
  landmark: string | null;
  /** WGS84 longitude from ST_X; null when listing has no pin. */
  lng: number | null;
  /** WGS84 latitude from ST_Y; null when listing has no pin. */
  lat: number | null;
  viewCount: number;
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
