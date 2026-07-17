export type ListingStatus = "draft" | "active" | "archived" | "removed";

export type ListingType =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_dorm_bed";

export type TargetAudience = "anyone" | "students_only";

export type ElectricityStatus = "solar" | "generator_24_7" | "scheduled_cuts";

export type WaterStatus = "state_well_24_7" | "tank_delivery";

export type Listing = {
  id: string;
  posterId: string;
  status: ListingStatus;
  listingType: ListingType;
  targetAudience: TargetAudience;
  monthlyRentUsd: number;
  electricity: ElectricityStatus;
  water: WaterStatus;
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  area: string;
  landmark: string | null;
  viewCount: number;
  publishedAt: string | null;
  expiresAt: string | null;
  boostedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  distanceMeters?: number;
};

export type ListingPhoto = {
  id: string;
  listingId: string;
  url: string;
  sortOrder: number;
};
