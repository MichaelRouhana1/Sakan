import { toWkt } from "@/lib/locationWkt";
import { hoursWithPowerFromWindows, toHHMM, windowComplete } from "@/lib/electricityCuts";
import {
  deriveContactPhones,
  numbersFromLegacy,
  serializeContactNumber,
} from "@/lib/lebanonPhone";
import type { CreateListingBody } from "@/features/listings/useCreateListing";
import { deriveListingType } from "./deriveListingType";
import type { CreateListingDraft } from "./draft";

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
  const areaSqm = draft.areaSqm.trim() ? Number(draft.areaSqm) : null;
  const rawNumbers = numbersFromLegacy(draft);
  const contactNumbers = rawNumbers
    .map(serializeContactNumber)
    .filter((n): n is NonNullable<typeof n> => n != null);
  const derivedPhones = deriveContactPhones(rawNumbers);

  const cutWindows =
    draft.electricity === "scheduled_cuts"
      ? (draft.electricityCutWindows ?? [])
          .map((w) => ({
            start: toHHMM(w.start) ?? "",
            end: toHHMM(w.end) ?? "",
          }))
          .filter(windowComplete)
      : [];
  const first = cutWindows[0];

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
    electricityCutsStart: first?.start ?? null,
    electricityCutsEnd: first?.end ?? null,
    electricityHoursOn:
      draft.electricity === "scheduled_cuts"
        ? hoursWithPowerFromWindows(cutWindows)
        : null,
    electricityCutWindows: cutWindows,
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
    contactPhone: derivedPhones.contactPhone ?? undefined,
    whatsappNumber: derivedPhones.whatsappNumber ?? undefined,
    contactNumbers,
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
