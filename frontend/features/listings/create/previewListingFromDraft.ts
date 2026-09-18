import { deriveListingType } from "@/features/listings/create/deriveListingType";
import type { CreateListingDraft } from "@/features/listings/create/draft";
import type { Listing } from "@/types/listing";

function depositFromDraft(draft: CreateListingDraft): number {
  const rent = Number(draft.monthlyRentUsd) || 0;
  if (draft.depositPreset === "none") return 0;
  if (draft.depositPreset === "1") return rent;
  if (draft.depositPreset === "2") return rent * 2;
  return Number(draft.securityDepositUsd || 0) || 0;
}

/** Enough of a Listing for browse-card preview in the create wizard. */
export function previewListingFromDraft(draft: CreateListingDraft): Listing {
  const ready = draft.photos.filter(
    (p) => p.status === "ready" && (p.url || p.uri),
  );
  const listingType =
    draft.spaceType && draft.propertyType
      ? deriveListingType(draft.spaceType, draft.propertyType)
      : "entire_apartment";
  const now = new Date().toISOString();

  return {
    id: "preview",
    posterId: "preview",
    status: "draft",
    listingType,
    spaceType: draft.spaceType ?? undefined,
    propertyType: draft.propertyType ?? undefined,
    priceBasis: draft.priceBasis,
    targetAudience: draft.targetAudience,
    genderRestriction: draft.genderRestriction,
    monthlyRentUsd: Number(draft.monthlyRentUsd) || 0,
    securityDepositUsd: depositFromDraft(draft),
    leaseTerm: draft.leaseTerm,
    availableFrom: draft.availableImmediate ? null : draft.availableFrom || null,
    paymentModality: draft.paymentModality,
    electricity: draft.electricity ?? "scheduled_cuts",
    electricityCutsStart: draft.electricityCutsStart || null,
    electricityCutsEnd: draft.electricityCutsEnd || null,
    electricityHoursOn: draft.electricityHoursOn,
    electricityCutWindows: draft.electricityCutWindows,
    water: draft.water ?? "tank_delivery",
    wifiIncluded: draft.wifiIncluded,
    routerUps: draft.routerUps,
    elevator24_7: draft.elevator24_7,
    hasElevator: draft.hasElevator,
    hasSolar: draft.hasSolar,
    generatorAmperes: draft.generatorAmperes,
    generatorIncluded: draft.generatorIncluded,
    conciergeIncluded: draft.conciergeIncluded,
    cookingGasIncluded: draft.cookingGasIncluded,
    bedrooms: draft.bedrooms,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    maxOccupancy: draft.maxOccupancy,
    furnishingType: draft.furnishingType ?? undefined,
    floorNumber: draft.floorNumber,
    areaSqm: draft.areaSqm.trim() ? Number(draft.areaSqm) : null,
    smokingPolicy: draft.smokingPolicy,
    petsPolicy: draft.petsPolicy,
    guestsPolicy: draft.guestsPolicy,
    quietHours: draft.quietHours,
    title: draft.title.trim() || null,
    highlightTags: draft.highlightTags,
    cardBadges: draft.cardBadges,
    listingPosterRole: draft.listingPosterRole ?? undefined,
    area: draft.area ?? "",
    landmark: draft.pin.landmarkLabel || draft.landmark || null,
    lng: draft.pin.lng,
    lat: draft.pin.lat,
    viewCount: 0,
    publishedAt: null,
    expiresAt: null,
    boostedUntil: null,
    createdAt: now,
    updatedAt: now,
    photos: ready.map((p, i) => ({
      id: p.localId,
      url: (p.url || p.uri) as string,
      sortOrder: i,
    })),
    coverUrl: ready[0] ? (ready[0].url || ready[0].uri) ?? null : null,
    amenities: draft.amenities,
  };
}
