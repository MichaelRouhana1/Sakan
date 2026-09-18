import type {
  ElectricityStatus,
  GenderRestriction,
  LeaseTerm,
  ListingPosterRole,
  ListingStatus,
  ListingType,
  PriceBasis,
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
  pbsa_building: "Student Building (PBSA)",
};

export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  per_unit_month: "Per unit / month",
  per_bed_month: "Per bed / month",
  per_room_month: "Per room / month",
};

export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  anyone: "Open to anyone",
  students_only: "Students only",
  students_professionals: "Students & professionals",
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

export const POSTER_ROLE_LABELS: Record<ListingPosterRole, string> = {
  landlord: "Owner",
  agent: "Agent",
  student_sublet: "Student sublet",
};

export function labelPosterRole(role: ListingPosterRole): string {
  return POSTER_ROLE_LABELS[role];
}

export function labelLeaseTerm(term: LeaseTerm): string {
  const labels: Record<LeaseTerm, string> = {
    semester: "Semester",
    months_6: "6 months",
    months_9: "9 months",
    year: "1 year",
    flexible: "Flexible / sublet",
  };
  return labels[term];
}

/** Short date for listing-level `availableFrom`; null when unset. */
export function formatAvailableFrom(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const day = s.slice(0, 10);
    const d = new Date(`${day}T12:00:00`);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return s.replace(/^Available\s+/i, "");
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
