import {
  hoursWithPowerFromWindows,
  resolveCutWindows,
} from "../../lib/electricityCuts.js";
import {
  deriveContactPhones,
  resolveContactNumbers,
} from "../../lib/lebanonPhone.js";
import { deriveListingType } from "./deriveListingType.js";
import type { ListingUpdateSnapshot } from "./listing-edit-fields.js";
import type { UpdateListingInput } from "./listings.schemas.js";

type PhotoRow = { url: string; caption?: string | null };

export type ListingUpdateRow = {
  spaceType: unknown;
  propertyType: unknown;
  listingType: unknown;
  targetAudience: unknown;
  genderRestriction: unknown;
  bedrooms: unknown;
  beds: unknown;
  bathrooms: unknown;
  maxOccupancy: unknown;
  floorNumber: unknown;
  areaSqm: unknown;
  area: unknown;
  landmark: unknown;
  addressLine: unknown;
  buildingName: unknown;
  primaryCampusId: unknown;
  lng: number | null;
  lat: number | null;
  monthlyRentUsd: unknown;
  securityDepositUsd: unknown;
  leaseTerm: unknown;
  availableFrom: unknown;
  paymentModality: unknown;
  priceBasis: unknown;
  electricity: unknown;
  electricityCutsStart: unknown;
  electricityCutsEnd: unknown;
  electricityHoursOn: unknown;
  electricityCutWindows: unknown;
  water: unknown;
  wifiIncluded: unknown;
  routerUps: unknown;
  hasElevator: unknown;
  elevator24_7: unknown;
  hasSolar: unknown;
  generatorIncluded: unknown;
  generatorAmperes: unknown;
  conciergeIncluded: unknown;
  cookingGasIncluded: unknown;
  amenities: unknown;
  furnishingType: unknown;
  smokingPolicy: unknown;
  petsPolicy: unknown;
  guestsPolicy: unknown;
  quietHours: unknown;
  title: unknown;
  description: unknown;
  highlightTags: unknown;
  cardBadges: unknown;
  photos?: PhotoRow[] | null;
  listingPosterRole: unknown;
  contactName: unknown;
  contactPhone: unknown;
  whatsappNumber: unknown;
  contactNumbers: unknown;
};

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function dateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Values that will be written, shared by the snapshot and the SQL update. */
export function listingWriteFromInput(input: UpdateListingInput) {
  const listingType =
    input.listingType ?? deriveListingType(input.spaceType, input.propertyType);
  const cutWindows = resolveCutWindows(input);
  const firstCut = cutWindows[0];
  const contactNumbers = resolveContactNumbers(input);
  const phones = deriveContactPhones(contactNumbers);
  const generatorAmperes =
    input.electricity === "solar" ? null : (input.generatorAmperes ?? null);

  return {
    listingType,
    spaceType: input.spaceType,
    propertyType: input.propertyType,
    priceBasis: input.priceBasis,
    targetAudience: input.targetAudience,
    genderRestriction: input.genderRestriction,
    monthlyRentUsd: input.monthlyRentUsd,
    securityDepositUsd: input.securityDepositUsd,
    leaseTerm: input.leaseTerm,
    availableFrom: dateOnly(input.availableFrom),
    paymentModality: input.paymentModality,
    electricity: input.electricity,
    electricityCutsStart: firstCut?.start ?? null,
    electricityCutsEnd: firstCut?.end ?? null,
    electricityHoursOn:
      input.electricity === "scheduled_cuts"
        ? hoursWithPowerFromWindows(cutWindows)
        : null,
    electricityCutWindows: cutWindows,
    water: input.water,
    wifiIncluded: input.wifiIncluded,
    routerUps: input.routerUps,
    elevator24_7: input.elevator24_7,
    hasElevator: input.hasElevator,
    hasSolar: input.hasSolar,
    generatorAmperes,
    generatorIncluded: input.generatorIncluded,
    conciergeIncluded: input.conciergeIncluded,
    cookingGasIncluded: input.cookingGasIncluded,
    amenities: input.amenities,
    bedrooms: input.bedrooms,
    beds: input.beds,
    bathrooms: input.bathrooms,
    maxOccupancy: input.maxOccupancy,
    furnishingType: input.furnishingType,
    floorNumber: input.floorNumber,
    areaSqm: input.areaSqm ?? null,
    smokingPolicy: input.smokingPolicy,
    petsPolicy: input.petsPolicy,
    guestsPolicy: input.guestsPolicy,
    quietHours: input.quietHours,
    title: input.title.trim(),
    description: input.description.trim(),
    highlightTags: input.highlightTags,
    cardBadges: input.cardBadges ?? null,
    listingPosterRole: input.listingPosterRole,
    contactName: input.contactName.trim(),
    contactPhone: phones.contactPhone ?? emptyToNull(input.contactPhone),
    whatsappNumber: phones.whatsappNumber ?? emptyToNull(input.whatsappNumber),
    contactNumbers,
    area: input.area,
    landmark: emptyToNull(input.landmark),
    addressLine: emptyToNull(input.addressLine),
    buildingName: emptyToNull(input.buildingName),
    primaryCampusId: emptyToNull(input.primaryCampusId),
    locationWkt: input.locationWkt,
    photos: input.photoUrls.map((url, index) => ({
      url,
      caption: emptyToNull(input.photoCaptions?.[index]),
    })),
  };
}

export function snapshotFromWrite(
  write: ReturnType<typeof listingWriteFromInput>,
): ListingUpdateSnapshot {
  const point = write.locationWkt;
  return {
    ...write,
    photos: write.photos,
    locationWkt: point,
  };
}

export function snapshotFromRow(row: ListingUpdateRow): ListingUpdateSnapshot {
  const lat = asNumber(row.lat);
  const lng = asNumber(row.lng);
  const photos = (row.photos ?? []).map((photo) => ({
    url: photo.url,
    caption: emptyToNull(photo.caption),
  }));
  return {
    spaceType: row.spaceType,
    propertyType: row.propertyType,
    listingType: row.listingType,
    targetAudience: row.targetAudience,
    genderRestriction: row.genderRestriction,
    bedrooms: asNumber(row.bedrooms),
    beds: asNumber(row.beds),
    bathrooms: asNumber(row.bathrooms),
    maxOccupancy: asNumber(row.maxOccupancy),
    floorNumber: asNumber(row.floorNumber),
    areaSqm: asNumber(row.areaSqm),
    area: row.area,
    landmark: emptyToNull(row.landmark),
    addressLine: emptyToNull(row.addressLine),
    buildingName: emptyToNull(row.buildingName),
    primaryCampusId: emptyToNull(row.primaryCampusId),
    lat,
    lng,
    locationWkt:
      lat != null && lng != null ? `POINT(${lng} ${lat})` : null,
    monthlyRentUsd: asNumber(row.monthlyRentUsd),
    securityDepositUsd: asNumber(row.securityDepositUsd),
    leaseTerm: row.leaseTerm,
    availableFrom: dateOnly(row.availableFrom),
    paymentModality: row.paymentModality,
    priceBasis: row.priceBasis,
    electricity: row.electricity,
    electricityCutsStart: emptyToNull(row.electricityCutsStart),
    electricityCutsEnd: emptyToNull(row.electricityCutsEnd),
    electricityHoursOn: asNumber(row.electricityHoursOn),
    electricityCutWindows: Array.isArray(row.electricityCutWindows)
      ? row.electricityCutWindows
      : [],
    water: row.water,
    wifiIncluded: Boolean(row.wifiIncluded),
    routerUps: Boolean(row.routerUps),
    hasElevator: Boolean(row.hasElevator),
    elevator24_7: Boolean(row.elevator24_7),
    hasSolar: Boolean(row.hasSolar),
    generatorIncluded: Boolean(row.generatorIncluded),
    generatorAmperes: asNumber(row.generatorAmperes),
    conciergeIncluded: Boolean(row.conciergeIncluded),
    cookingGasIncluded: Boolean(row.cookingGasIncluded),
    amenities: asStringArray(row.amenities),
    furnishingType: row.furnishingType,
    smokingPolicy: row.smokingPolicy,
    petsPolicy: row.petsPolicy,
    guestsPolicy: row.guestsPolicy,
    quietHours: Boolean(row.quietHours),
    title: String(row.title ?? "").trim(),
    description: String(row.description ?? "").trim(),
    highlightTags: asStringArray(row.highlightTags),
    cardBadges: row.cardBadges == null ? null : asStringArray(row.cardBadges),
    photos,
    listingPosterRole: row.listingPosterRole,
    contactName: String(row.contactName ?? "").trim(),
    contactPhone: emptyToNull(row.contactPhone),
    whatsappNumber: emptyToNull(row.whatsappNumber),
    contactNumbers: Array.isArray(row.contactNumbers) ? row.contactNumbers : [],
  };
}
