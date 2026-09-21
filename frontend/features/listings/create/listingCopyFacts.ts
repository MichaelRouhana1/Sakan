import type { CreateListingDraft } from "./draft";
import type { CopyFacts } from "./listingCopyTemplates";
import { toHHMM, windowComplete } from "@/lib/electricityCuts";

/** Deliberately independent of publish/preview mappings: neither may invent defaults here. */
export function listingCopyFacts(draft: CreateListingDraft, campus?: { id: string; name: string } | null): CopyFacts {
  const rent = draft.monthlyRentUsd.trim() ? Number(draft.monthlyRentUsd) : null;
  const validRent = rent != null && Number.isInteger(rent) && rent > 0 ? rent : null;
  const customDeposit = draft.securityDepositUsd.trim() ? Number(draft.securityDepositUsd) : null;
  const deposit = draft.depositPreset === "none" ? 0
    : draft.depositPreset === "1" ? validRent
    : draft.depositPreset === "2" ? validRent == null ? null : validRent * 2
    : customDeposit != null && Number.isInteger(customDeposit) && customDeposit >= 0 ? customDeposit : null;
  const windows = draft.electricityCutWindows?.length ? draft.electricityCutWindows
    : [{ start: draft.electricityCutsStart, end: draft.electricityCutsEnd }];
  return {
    spaceType: draft.spaceType, propertyType: draft.propertyType, area: draft.area,
    primaryCampusId: draft.primaryCampusId,
    campusName: campus?.id === draft.primaryCampusId ? campus?.name : null,
    landmark: (draft.pin.landmarkLabel || draft.landmark).trim().slice(0, 160),
    bedrooms: draft.bedrooms, beds: draft.beds, bathrooms: draft.bathrooms,
    maxOccupancy: draft.maxOccupancy, furnishingType: draft.furnishingType,
    electricity: draft.electricity,
    electricityCutWindows: draft.electricity === "scheduled_cuts" ? windows.map((w) => ({ start: toHHMM(w.start) ?? "", end: toHHMM(w.end) ?? "" })).filter(windowComplete) : [],
    generatorAmperes: draft.generatorAmperes, hasSolar: draft.hasSolar,
    generatorIncluded: draft.generatorIncluded, water: draft.water,
    wifiIncluded: draft.wifiIncluded, routerUps: draft.routerUps,
    hasElevator: draft.hasElevator, elevator24_7: draft.elevator24_7,
    conciergeIncluded: draft.conciergeIncluded, cookingGasIncluded: draft.cookingGasIncluded,
    monthlyRentUsd: validRent, securityDepositUsd: deposit, priceBasis: draft.priceBasis,
    leaseTerm: draft.leaseTerm, paymentModality: draft.paymentModality,
    targetAudience: draft.targetAudience, genderRestriction: draft.genderRestriction,
    amenities: [...draft.amenities], highlightTags: [...draft.highlightTags],
  };
}
