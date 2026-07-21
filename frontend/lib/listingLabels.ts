import type {
  ElectricityStatus,
  GenderRestriction,
  ListingStatus,
  ListingType,
  TargetAudience,
  WaterStatus,
} from "@/types/listing";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Live",
  draft: "Draft",
  archived: "Archived",
  removed: "Removed",
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  entire_apartment: "Entire apartment",
  studio: "Studio",
  private_room: "Private room",
  shared_dorm_bed: "Shared dorm bed",
};

export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  anyone: "Open to anyone",
  students_only: "Students only",
};

export const GENDER_RESTRICTION_LABELS: Record<GenderRestriction, string> = {
  anyone: "Anyone",
  boys_only: "Boys only",
  girls_only: "Girls only",
};

/** Browse filter chips — empty selection = any gender. */
export const GENDER_FILTER_OPTIONS: Exclude<
  GenderRestriction,
  "anyone"
>[] = ["boys_only", "girls_only"];

export function labelStatus(status: ListingStatus): string {
  return LISTING_STATUS_LABELS[status];
}

export function labelListingType(type: ListingType): string {
  return LISTING_TYPE_LABELS[type];
}

export function labelAudience(audience: TargetAudience): string {
  return TARGET_AUDIENCE_LABELS[audience];
}

export function labelGenderRestriction(
  value: GenderRestriction,
): string {
  return GENDER_RESTRICTION_LABELS[value];
}

export function labelElectricity(value: ElectricityStatus): string {
  return ELECTRICITY_LABELS[value];
}

export function labelWater(value: WaterStatus): string {
  return WATER_LABELS[value];
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatExpiry(iso: string | null): string {
  const days = daysUntil(iso);
  if (days == null) return "No expiry set";
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 7) return `${days} days left`;
  return `Expires ${new Date(iso!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`;
}
