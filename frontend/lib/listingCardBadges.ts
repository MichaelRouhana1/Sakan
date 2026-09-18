import {
  AMENITY_OPTIONS,
  FURNISHING_OPTIONS,
  PAYMENT_MODALITY_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SPACE_TYPE_OPTIONS,
  amenityLabel,
  highlightLabel,
} from "@/constants/listingWizard";
import { formatFreshUsd } from "@/lib/format";
import {
  highlightTagIcon,
  type ListingPillIconKey,
} from "@/lib/listingPillIcons";
import {
  formatAvailableFrom,
  labelLeaseTerm,
  labelPosterRole,
} from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";
import { normalizeCardBadgeSelection } from "@/lib/cardBadgeSelection";

export type ListingAmberPill = {
  key: string;
  label: string;
  icon?: ListingPillIconKey;
};

export { GRID_TAG_LIMIT } from "@/lib/cardBadgeSelection";

export const CARD_BADGE_MAX = 32;

export type CardBadgeGroupId =
  | "identity"
  | "utilities"
  | "space"
  | "terms"
  | "amenities"
  | "rules";

export const CARD_BADGE_GROUPS: { id: CardBadgeGroupId; title: string }[] = [
  { id: "identity", title: "Who can stay" },
  { id: "utilities", title: "Power & water" },
  { id: "space", title: "Space" },
  { id: "terms", title: "Terms" },
  { id: "amenities", title: "Amenities" },
  { id: "rules", title: "House rules" },
];

const HIGHLIGHT_PILL_KEYS = new Set([
  "girls_foyer",
  "boys_foyer",
  "students",
]);

export function isHighlightCardBadge(key: string): boolean {
  return HIGHLIGHT_PILL_KEYS.has(key) || key.startsWith("hl-");
}

/**
 * Map schema fields → Amber-style pill labels.
 * Skips Direct Owner (no `posted_by` field). `anyone` → no gender pill.
 */
export function listingAmberPills(listing: Listing): ListingAmberPill[] {
  const pills: ListingAmberPill[] = [];

  if (listing.genderRestriction === "girls_only") {
    pills.push({ key: "girls_foyer", label: "Girls Foyer", icon: "girls" });
  } else if (listing.genderRestriction === "boys_only") {
    pills.push({ key: "boys_foyer", label: "Boys Foyer", icon: "boys" });
  }

  if (listing.electricity === "generator_24_7") {
    pills.push({ key: "power_24", label: "24/7 Power", icon: "zap" });
  } else if (listing.electricity === "solar") {
    pills.push({ key: "solar", label: "Solar Power", icon: "sun" });
  } else if (listing.electricity === "scheduled_cuts") {
    const hours =
      listing.electricityHoursOn ?? listing.infrastructure?.electricity.hoursOn;
    pills.push({
      key: "cuts",
      label: hours != null ? `${hours}/24 Power` : "Scheduled Cuts",
      icon: "zap",
    });
  }

  if (listing.routerUps) {
    pills.push({ key: "ups_wifi", label: "UPS Wi-Fi", icon: "battery" });
  } else if (listing.wifiIncluded) {
    pills.push({ key: "wifi", label: "Wi-Fi", icon: "wifi" });
  }

  if (listing.water === "state_well_24_7") {
    pills.push({ key: "water_24", label: "24/7 Water", icon: "shower" });
  } else if (listing.water === "tank_delivery") {
    pills.push({ key: "tank", label: "Tank Delivery", icon: "droplets" });
  }

  if (listing.elevator24_7) {
    pills.push({ key: "elevator", label: "Elevator 24/7", icon: "elevator" });
  }

  if (listing.targetAudience === "students_only") {
    pills.push({ key: "students", label: "Students only", icon: "graduation" });
  } else if (listing.targetAudience === "students_professionals") {
    pills.push({
      key: "students_pro",
      label: "Students & professionals",
      icon: "users",
    });
  }

  for (const tag of listing.highlightTags ?? []) {
    pills.push({
      key: `hl-${tag}`,
      label: highlightLabel(tag),
      icon: highlightTagIcon(tag),
    });
  }

  return pills;
}

/** Offer/identity pills shown above the second Amber divider. */
export function listingAmberPillGroups(listing: Listing): {
  highlights: ListingAmberPill[];
  amenities: ListingAmberPill[];
} {
  const pills = listingAmberPills(listing);
  return {
    highlights: pills.filter(
      (p) => HIGHLIGHT_PILL_KEYS.has(p.key) || p.key.startsWith("hl-"),
    ),
    amenities: pills.filter(
      (p) => !HIGHLIGHT_PILL_KEYS.has(p.key) && !p.key.startsWith("hl-"),
    ),
  };
}

function extraFactPills(listing: Listing): ListingAmberPill[] {
  const pills: ListingAmberPill[] = [];

  if (listing.furnishingType) {
    const short: Record<string, string> = {
      furnished: "Furnished",
      semi: "Semi-furnished",
      unfurnished: "Unfurnished",
    };
    pills.push({
      key: "furnishing",
      label:
        short[listing.furnishingType] ??
        FURNISHING_OPTIONS.find((o) => o.value === listing.furnishingType)
          ?.label ??
        listing.furnishingType,
    });
  }

  if (listing.spaceType) {
    pills.push({
      key: "space_type",
      label:
        SPACE_TYPE_OPTIONS.find((o) => o.value === listing.spaceType)?.title ??
        listing.spaceType,
    });
  }

  if (listing.propertyType) {
    pills.push({
      key: "property_type",
      label:
        PROPERTY_TYPE_OPTIONS.find((o) => o.value === listing.propertyType)
          ?.label ?? listing.propertyType,
    });
  }

  if ((listing.beds ?? 0) >= 1) {
    const n = listing.beds!;
    pills.push({
      key: "beds",
      label: n === 1 ? "1 bed" : `${n} beds`,
    });
  }

  if ((listing.bathrooms ?? 0) > 0) {
    const n = listing.bathrooms!;
    const text = Number.isInteger(n) ? String(n) : String(n);
    pills.push({
      key: "bathrooms",
      label: n === 1 ? "1 bath" : `${text} baths`,
      icon: "shower",
    });
  }

  if ((listing.maxOccupancy ?? 0) >= 1) {
    const n = listing.maxOccupancy!;
    pills.push({
      key: "occupancy",
      label: n === 1 ? "1 guest" : `${n} guests`,
      icon: "users",
    });
  }

  if (listing.areaSqm != null && listing.areaSqm > 0) {
    pills.push({
      key: "sqm",
      label: `${listing.areaSqm} m²`,
    });
  }

  if (listing.floorNumber != null) {
    pills.push({
      key: "floor",
      label:
        listing.floorNumber === 0
          ? "Ground floor"
          : `Floor ${listing.floorNumber}`,
    });
  }

  if ((listing.securityDepositUsd ?? 0) > 0) {
    pills.push({
      key: "deposit",
      label: `Deposit ${formatFreshUsd(listing.securityDepositUsd!)}`,
      icon: "shield",
    });
  }

  if (listing.leaseTerm) {
    pills.push({
      key: "lease_term",
      label: labelLeaseTerm(listing.leaseTerm),
    });
  }

  const available = formatAvailableFrom(listing.availableFrom);
  if (available) {
    pills.push({
      key: "available_from",
      label: `From ${available}`,
    });
  }

  if (listing.paymentModality) {
    const short: Record<string, string> = {
      monthly: "Monthly",
      semester: "Per semester",
      quarterly: "Quarterly",
    };
    pills.push({
      key: "payment",
      label:
        short[listing.paymentModality] ??
        PAYMENT_MODALITY_OPTIONS.find((o) => o.value === listing.paymentModality)
          ?.label ??
        listing.paymentModality,
    });
  }

  if (
    listing.generatorAmperes != null &&
    listing.electricity !== "solar"
  ) {
    pills.push({
      key: "gen_amps",
      label: `${listing.generatorAmperes}A`,
      icon: "zap",
    });
  }

  if (listing.generatorIncluded) {
    pills.push({ key: "generator", label: "Generator", icon: "zap" });
  }

  if (listing.cookingGasIncluded) {
    pills.push({ key: "cooking_gas", label: "Cooking gas" });
  }

  if (listing.conciergeIncluded) {
    pills.push({ key: "concierge", label: "Concierge" });
  }

  if (listing.hasElevator && !listing.elevator24_7) {
    pills.push({ key: "has_elevator", label: "Elevator", icon: "elevator" });
  }

  if (listing.hasSolar && listing.electricity !== "solar") {
    pills.push({ key: "has_solar", label: "Solar", icon: "sun" });
  }

  for (const slug of listing.amenities ?? []) {
    const opt = AMENITY_OPTIONS.find((o) => o.slug === slug);
    pills.push({
      key: `amenity:${slug}`,
      label: opt?.label ?? amenityLabel(slug),
    });
  }

  if (listing.smokingPolicy === "no") {
    pills.push({ key: "smoking_no", label: "No smoking" });
  }
  if (listing.petsPolicy === "no") {
    pills.push({ key: "pets_no", label: "No pets" });
  }
  if (listing.guestsPolicy === "restricted") {
    pills.push({
      key: "guests_restricted",
      label: "Guests restricted",
      icon: "users",
    });
  } else if (listing.guestsPolicy === "no") {
    pills.push({ key: "guests_no", label: "No guests" });
  }
  if (listing.quietHours) {
    pills.push({ key: "quiet_hours", label: "Quiet hours", icon: "volumeOff" });
  }

  if (listing.listingPosterRole) {
    pills.push({
      key: "poster",
      label: labelPosterRole(listing.listingPosterRole),
    });
  }

  return pills;
}

function groupForKey(key: string): CardBadgeGroupId {
  if (
    key === "girls_foyer" ||
    key === "boys_foyer" ||
    key === "students" ||
    key === "students_pro" ||
    key.startsWith("hl-")
  ) {
    return "identity";
  }
  if (
    key === "power_24" ||
    key === "solar" ||
    key === "cuts" ||
    key === "ups_wifi" ||
    key === "wifi" ||
    key === "water_24" ||
    key === "tank" ||
    key === "elevator" ||
    key === "gen_amps" ||
    key === "generator" ||
    key === "has_elevator" ||
    key === "has_solar"
  ) {
    return "utilities";
  }
  if (key.startsWith("amenity:")) return "amenities";
  if (
    key === "smoking_no" ||
    key === "pets_no" ||
    key === "guests_restricted" ||
    key === "guests_no" ||
    key === "quiet_hours"
  ) {
    return "rules";
  }
  if (
    key === "deposit" ||
    key === "lease_term" ||
    key === "available_from" ||
    key === "payment" ||
    key === "poster"
  ) {
    return "terms";
  }
  return "space";
}

export function listingCardCandidates(listing: Listing): ListingAmberPill[] {
  const pills: ListingAmberPill[] = [];
  const seen = new Set<string>();
  const push = (pill: ListingAmberPill) => {
    if (seen.has(pill.key)) return;
    seen.add(pill.key);
    pills.push(pill);
  };
  for (const pill of listingAmberPills(listing)) push(pill);
  for (const pill of extraFactPills(listing)) push(pill);
  return pills;
}

export function listingCardCandidateMap(
  listing: Listing,
): Map<string, ListingAmberPill> {
  return new Map(listingCardCandidates(listing).map((p) => [p.key, p]));
}

export function listingCardCandidatesByGroup(
  listing: Listing,
): { id: CardBadgeGroupId; title: string; pills: ListingAmberPill[] }[] {
  const byGroup = new Map<CardBadgeGroupId, ListingAmberPill[]>();
  for (const group of CARD_BADGE_GROUPS) byGroup.set(group.id, []);
  for (const pill of listingCardCandidates(listing)) {
    const id = groupForKey(pill.key);
    byGroup.get(id)?.push(pill);
  }
  return CARD_BADGE_GROUPS.map((group) => ({
    ...group,
    pills: byGroup.get(group.id) ?? [],
  })).filter((group) => group.pills.length > 0);
}

export function resolveCardBadges(
  listing: Listing,
  keys: string[],
): ListingAmberPill[] {
  const map = listingCardCandidateMap(listing);
  const pills: ListingAmberPill[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    const pill = map.get(key);
    if (!pill) continue;
    seen.add(key);
    pills.push(pill);
  }
  return pills;
}

export function sanitizeCardBadges(
  listing: Listing,
  keys: string[],
): string[] {
  return resolveCardBadges(listing, keys).map((p) => p.key);
}

/** Default order matches today’s grid merge: highlights then amenity pills. */
export function defaultCardBadgeKeys(listing: Listing): string[] {
  const { highlights, amenities } = listingAmberPillGroups(listing);
  return [...highlights, ...amenities].map((p) => p.key);
}

/** Wizard selection: null means defaults; [] is an intentional empty card. */
export function draftCardBadgeKeys(listing: Listing): string[] {
  return normalizeCardBadgeSelection(
    listing.cardBadges,
    defaultCardBadgeKeys(listing),
    listingCardCandidates(listing).map((pill) => pill.key),
  );
}

export function listingCardPills(listing: Listing): ListingAmberPill[] {
  if (listing.cardBadges != null) {
    return resolveCardBadges(listing, listing.cardBadges);
  }
  return listingAmberPills(listing);
}

export function sameBadgeKeys(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((key, i) => key === b[i]);
}
