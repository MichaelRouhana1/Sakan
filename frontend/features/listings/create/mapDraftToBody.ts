import { toWkt } from "@/lib/locationWkt";
import type { CreateListingBody } from "@/features/listings/useCreateListing";
import { deriveListingType } from "./deriveListingType";
import type { CreateListingDraft } from "./draft";

function digitsPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("961")) return `+${digits}`;
  if (digits.startsWith("0")) return `+961${digits.slice(1)}`;
  return `+961${digits}`;
}

export function mapDraftToBody(draft: CreateListingDraft): CreateListingBody {
  const rent = Number(draft.monthlyRentUsd);
  const deposit =
    draft.depositPreset === "none"
      ? 0
      : draft.depositPreset === "1"
        ? rent
        : draft.depositPreset === "2"
          ? rent * 2
          : Number(draft.securityDepositUsd || 0);
  const ready = draft.photos.filter((p) => p.status === "ready" && p.url);
  const phone = digitsPhone(draft.contactPhone);
  const wa = draft.whatsappSameAsPhone
    ? phone
    : digitsPhone(draft.whatsappNumber || draft.contactPhone);
  const areaSqm = draft.areaSqm.trim() ? Number(draft.areaSqm) : null;

  return {
    spaceType: draft.spaceType!,
    propertyType: draft.propertyType!,
    priceBasis: draft.priceBasis,
    listingType: deriveListingType(draft.spaceType!, draft.propertyType!),
    targetAudience: draft.targetAudience,
    genderRestriction: draft.genderRestriction,
    monthlyRentUsd: rent,
    securityDepositUsd: deposit,
    leaseTerm: draft.leaseTerm,
    availableFrom: draft.availableImmediate ? null : draft.availableFrom,
    paymentModality: draft.paymentModality,
    electricity: draft.electricity!,
    water: draft.water!,
    wifiIncluded: draft.wifiIncluded,
    routerUps: draft.routerUps,
    elevator24_7: draft.elevator24_7,
    hasElevator: draft.hasElevator,
    hasSolar: draft.hasSolar,
    generatorAmperes: draft.generatorAmperes,
    generatorIncluded: draft.generatorIncluded,
    conciergeIncluded: draft.conciergeIncluded,
    cookingGasIncluded: draft.cookingGasIncluded,
    amenities: draft.amenities,
    bedrooms: draft.bedrooms,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    maxOccupancy: draft.maxOccupancy,
    furnishingType: draft.furnishingType!,
    floorNumber: draft.floorNumber,
    areaSqm: areaSqm != null && Number.isFinite(areaSqm) ? areaSqm : null,
    smokingPolicy: draft.smokingPolicy,
    petsPolicy: draft.petsPolicy,
    guestsPolicy: draft.guestsPolicy,
    quietHours: draft.quietHours,
    title: draft.title.trim(),
    description: draft.description.trim(),
    highlightTags: draft.highlightTags,
    listingPosterRole: draft.listingPosterRole!,
    contactName: draft.contactName.trim(),
    contactPhone: phone,
    whatsappNumber: wa,
    area: draft.area!,
    landmark: draft.pin.landmarkLabel || draft.landmark || undefined,
    addressLine: draft.addressLine.trim() || undefined,
    buildingName: draft.buildingName.trim() || undefined,
    primaryCampusId: draft.primaryCampusId,
    locationWkt: toWkt({ lng: draft.pin.lng, lat: draft.pin.lat }),
    photoUrls: ready.map((p) => p.url!),
    photoCaptions: ready.map((p) => p.caption ?? ""),
    publishNow: true,
  };
}
