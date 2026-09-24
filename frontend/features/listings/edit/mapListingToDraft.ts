import type { ListingPin } from "@/components/listings/LocationPicker";
import type { LebanonArea } from "@/constants/areas";
import {
  EMPTY_PIN,
  INITIAL_DRAFT,
  type CreateListingDraft,
} from "@/features/listings/create/draft";
import { coerceCutWindows, emptyCutWindow } from "@/lib/electricityCuts";
import { emptyContactNumber, numbersFromLegacy } from "@/lib/lebanonPhone";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Listing } from "@/types/listing";

function dateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function depositPreset(
  rent: number,
  deposit: number,
): CreateListingDraft["depositPreset"] {
  if (deposit === 0) return "none";
  if (deposit === rent) return "1";
  if (deposit === rent * 2) return "2";
  return "custom";
}

export function mapListingToDraft(listing: Listing): CreateListingDraft {
  const rent = listing.monthlyRentUsd;
  const deposit = listing.securityDepositUsd ?? 0;
  const preset = depositPreset(rent, deposit);
  const windows = coerceCutWindows(
    listing.electricityCutWindows,
    listing.electricityCutsStart,
    listing.electricityCutsEnd,
  );
  const numbers =
    listing.contactNumbers && listing.contactNumbers.length > 0
      ? listing.contactNumbers
      : numbersFromLegacy({
          contactPhone: listing.contactPhone ?? "",
          whatsappNumber: listing.whatsappNumber ?? "",
        });
  const hasPin = listing.lng != null && listing.lat != null;
  const pin: ListingPin = hasPin
    ? {
        lng: listing.lng as number,
        lat: listing.lat as number,
        confirmed: true,
        source: "pin",
        landmarkId: null,
        landmarkLabel: listing.landmark ?? "",
      }
    : EMPTY_PIN;

  return {
    ...INITIAL_DRAFT,
    step: 0,
    spaceType: listing.spaceType ?? null,
    propertyType: listing.propertyType ?? null,
    priceBasis: listing.priceBasis ?? "per_unit_month",
    area: (listing.area as LebanonArea) || null,
    addressLine: listing.addressLine ?? "",
    buildingName: listing.buildingName ?? "",
    pin,
    primaryCampusId: listing.primaryCampusId ?? null,
    landmark: listing.landmark ?? "",
    bedrooms: listing.bedrooms ?? 1,
    beds: listing.beds ?? 1,
    bathrooms: listing.bathrooms ?? 1,
    maxOccupancy: listing.maxOccupancy ?? 1,
    furnishingType: listing.furnishingType ?? null,
    floorNumber: listing.floorNumber ?? 0,
    areaSqm: listing.areaSqm != null ? String(listing.areaSqm) : "",
    hasElevator: Boolean(listing.hasElevator),
    elevator24_7: Boolean(listing.elevator24_7),
    electricity: listing.electricity,
    electricityCutWindows: windows.length > 0 ? windows : [emptyCutWindow()],
    electricityCutsStart: windows[0]?.start ?? "",
    electricityCutsEnd: windows[0]?.end ?? "",
    electricityHoursOn: listing.electricityHoursOn ?? null,
    generatorAmperes: listing.generatorAmperes ?? null,
    hasSolar: Boolean(listing.hasSolar),
    generatorIncluded: Boolean(listing.generatorIncluded),
    water: listing.water,
    wifiIncluded: Boolean(listing.wifiIncluded),
    routerUps: Boolean(listing.routerUps),
    conciergeIncluded: Boolean(listing.conciergeIncluded),
    cookingGasIncluded: Boolean(listing.cookingGasIncluded),
    amenities: listing.amenities ?? [],
    genderRestriction: listing.genderRestriction,
    targetAudience: listing.targetAudience,
    smokingPolicy: listing.smokingPolicy ?? "no",
    petsPolicy: listing.petsPolicy ?? "no",
    guestsPolicy: listing.guestsPolicy ?? "restricted",
    quietHours: Boolean(listing.quietHours),
    photos: listing.photos.map((photo, index) => {
      const display = resolveMediaUrl(photo.url) ?? photo.url;
      return {
        localId: photo.id || `photo-${index}`,
        uri: display,
        url: photo.url,
        caption: photo.caption ?? "",
        status: "ready" as const,
      };
    }),
    monthlyRentUsd: String(rent),
    depositPreset: preset,
    securityDepositUsd: preset === "custom" ? String(deposit) : "",
    leaseTerm: listing.leaseTerm ?? "flexible",
    availableImmediate: !dateOnly(listing.availableFrom),
    availableFrom: dateOnly(listing.availableFrom),
    paymentModality: listing.paymentModality ?? "monthly",
    title: listing.title ?? "",
    description: listing.description ?? "",
    highlightTags: listing.highlightTags ?? [],
    cardBadges: listing.cardBadges ?? null,
    listingPosterRole: listing.listingPosterRole ?? null,
    contactName: listing.contactName ?? "",
    contactNumbers: numbers.length > 0 ? numbers : [emptyContactNumber()],
    contactPhone: listing.contactPhone ?? "",
    whatsappSameAsPhone:
      numbers.length <= 1 ||
      (listing.whatsappNumber != null &&
        listing.whatsappNumber === listing.contactPhone),
    whatsappNumber: listing.whatsappNumber ?? "",
  };
}

export function applyLockedBaseline(
  current: CreateListingDraft,
  baseline: CreateListingDraft,
): CreateListingDraft {
  return {
    ...current,
    spaceType: baseline.spaceType,
    propertyType: baseline.propertyType,
    targetAudience: baseline.targetAudience,
    genderRestriction: baseline.genderRestriction,
    bedrooms: baseline.bedrooms,
    beds: baseline.beds,
    bathrooms: baseline.bathrooms,
    maxOccupancy: baseline.maxOccupancy,
    floorNumber: baseline.floorNumber,
    areaSqm: baseline.areaSqm,
    area: baseline.area,
    pin: baseline.pin,
    landmark: baseline.landmark,
    addressLine: baseline.addressLine,
    buildingName: baseline.buildingName,
    primaryCampusId: baseline.primaryCampusId,
  };
}
