import { MAX_MONTHLY_RENT_USD, MAX_SECURITY_DEPOSIT_USD, RENT_USD_MESSAGE, DEPOSIT_USD_MESSAGE } from "@/constants/listingPricing";
import {
  windowComplete,
  type CutWindow,
} from "@/lib/electricityCuts";
import { numberComplete, numbersFromLegacy } from "@/lib/lebanonPhone";
import type { CreateListingDraft } from "./draft";
import {
  GENERATOR_AMP_OPTIONS,
  LAST_REQUIRED_SECTION_INDEX,
  LISTING_FORM_SECTIONS,
} from "@/constants/listingWizard";

export const COPY_TITLE_MIN = 10;
export const COPY_TITLE_MAX = 60;
export const COPY_DESCRIPTION_MIN = 20;

const FIELD_MESSAGES: Record<string, string> = {
  spaceType: "Choose a rental type",
  propertyType: "Choose a property type",
  area: "Select an area",
  pin: "Confirm the map pin",
  primaryCampusId: "Choose a primary campus",
  furnishingType: "Select furnishing",
  beds: "Add at least one bed",
  maxOccupancy: "Set max occupancy to at least 1",
  electricity: "Select electricity status",
  generatorAmperes: "Select generator / ishtirak amps",
  water: "Select water status",
  photos: "Finish uploading 3–15 unit photos",
  bathroomPrivacy: "Choose a private or shared bathroom",
  bedsAvailable: "Confirm available beds between 1 and the total",
  sharedPhotos: "Finish uploading the shared photos (maximum 15)",
  monthlyRentUsd: RENT_USD_MESSAGE,
  priceBasis: "Choose how rent is listed",
  depositPreset: "Choose a security deposit",
  securityDepositUsd: DEPOSIT_USD_MESSAGE,
  leaseTerm: "Choose a minimum lease",
  availableFrom: "Choose available immediately or pick a date",
  paymentModality: "Choose how rent is paid",
  title: `Title must be ${COPY_TITLE_MIN}–${COPY_TITLE_MAX} characters`,
  description: `Description must be ${COPY_DESCRIPTION_MIN}–4000 characters`,
  listingPosterRole: "Choose your role",
  targetAudience: "Choose a tenant mix",
  smokingPolicy: "Choose a smoking rule",
  petsPolicy: "Choose a pets rule",
  guestsPolicy: "Choose an overnight guests rule",
  contactName: "Enter a contact name",
  contactPhone: "Enter a valid phone number",
};

export type WizardValidationIssue = {
  step: number;
  stepTitle: string;
  fields: string[];
  messages: string[];
};

export function fieldErrorMessage(field: string): string {
  return FIELD_MESSAGES[field] ?? `Complete ${field}`;
}

export function isPhotoReady(
  photo: CreateListingDraft["photos"][number],
): boolean {
  return (
    photo.status === "ready" && Boolean(photo.url || photo.uri)
  );
}

export function countReadyPhotos(draft: CreateListingDraft): number {
  return draft.photos.filter(isPhotoReady).length;
}

export function stepFieldErrors(
  draft: CreateListingDraft,
  step: number,
  _unitOnly = false,
): string[] {
  switch (step) {
    case 0: {
      const errors: string[] = [];
      if (!draft.spaceType) errors.push("spaceType");
      if (!draft.propertyType) errors.push("propertyType");
      if (draft.existingPlaceId && draft.placeKind==='building' && draft.spaceType!=='entire_place') errors.push('A building contains whole apartments');
      return errors;
    }
    case 1: {
      const errors: string[] = [];
      if (!draft.area) errors.push("area");
      if (!draft.pin.confirmed) errors.push("pin");
      if (!draft.primaryCampusId) errors.push("primaryCampusId");
      return errors;
    }
    case 2: {
      const errors: string[] = [];
      if (!draft.furnishingType) errors.push("furnishingType");
      if (!draft.sharedValues && !draft.bathroomPrivacy) errors.push('bathroomPrivacy');
      if (!draft.sharedValues && draft.spaceType==='shared_room' && (!Number.isInteger(draft.bedsAvailable) || Number(draft.bedsAvailable)<1 || Number(draft.bedsAvailable)>draft.beds)) errors.push('bedsAvailable');
      if (draft.beds < 1) errors.push("beds");
      if (draft.maxOccupancy < 1) errors.push("maxOccupancy");
      return errors;
    }
    case 3: {
      const errors: string[] = [];
      if (!draft.electricity) errors.push("electricity");
      if (
        draft.electricity === "generator_24_7" ||
        draft.electricity === "scheduled_cuts"
      ) {
        if (
          draft.generatorAmperes == null ||
          !(GENERATOR_AMP_OPTIONS as readonly number[]).includes(
            draft.generatorAmperes,
          )
        ) {
          errors.push("generatorAmperes");
        }
      }
      if (draft.electricity === "scheduled_cuts") {
        const windows: CutWindow[] =
          draft.electricityCutWindows?.length > 0
            ? draft.electricityCutWindows
            : [{ start: draft.electricityCutsStart, end: draft.electricityCutsEnd }];
        const complete = windows.filter(windowComplete);
        if (complete.length === 0) errors.push("electricityCutWindows");
        windows.forEach((w, i) => {
          const blank = !w.start && !w.end;
          if (blank) return;
          if (!windowComplete(w)) errors.push(`electricityCutWindows.${i}`);
        });
      }
      if (!draft.water) errors.push("water");
      return errors;
    }
    case 4: {
      const errors: string[] = [];
      if (!draft.targetAudience) errors.push("targetAudience");
      if (!draft.smokingPolicy) errors.push("smokingPolicy");
      if (!draft.petsPolicy) errors.push("petsPolicy");
      if (!draft.guestsPolicy) errors.push("guestsPolicy");
      return errors;
    }
    case 5: {
      const ready = countReadyPhotos(draft);
      if (ready < 3 || draft.photos.length>15 || draft.photos.some((p) => !isPhotoReady(p))) {
        return ["photos"];
      }
      return [];
    }
    case 6: {
      const errors: string[] = [];
      const rent = Number(draft.monthlyRentUsd);
      if (!draft.priceBasis) errors.push("priceBasis");
      if (!Number.isInteger(rent) || rent <= 0 || rent > MAX_MONTHLY_RENT_USD) errors.push("monthlyRentUsd");
      if (!draft.depositPreset) errors.push("depositPreset");
      if (draft.depositPreset === "custom") {
        const dep = Number(draft.securityDepositUsd);
        if (!Number.isInteger(dep) || dep < 0 || dep > MAX_SECURITY_DEPOSIT_USD) errors.push("securityDepositUsd");
      }
      if (!draft.leaseTerm) errors.push("leaseTerm");
      if (draft.availableImmediate !== true && !/^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom)) {
        errors.push("availableFrom");
      }
      if (!draft.paymentModality) errors.push("paymentModality");
      return errors;
    }
    case 7: {
      const errors: string[] = [];
      const titleLen = draft.title.trim().length;
      if (titleLen < COPY_TITLE_MIN || titleLen > COPY_TITLE_MAX) {
        errors.push("title");
      }
      if (draft.description.trim().length < COPY_DESCRIPTION_MIN || draft.description.trim().length > 4000) {
        errors.push("description");
      }
      return errors;
    }
    case 8: {
      const errors: string[] = [];
      if (!draft.listingPosterRole) errors.push("listingPosterRole");
      if (draft.contactName.trim().length < 2) errors.push("contactName");
      const numbers = numbersFromLegacy(draft);
      const complete = numbers.filter(numberComplete);
      if (complete.length === 0) errors.push("contactNumbers");
      numbers.forEach((n, i) => {
        const blank = !n.subscriber;
        if (blank && numbers.length > 1) return;
        if (!numberComplete(n)) errors.push(`contactNumbers.${i}`);
      });
      return errors;
    }
    default:
      return [];
  }
}

/** All blocking issues across required wizard steps (excludes Review). */
export function listingFormIssues(
  draft: CreateListingDraft,
): WizardValidationIssue[] {
  const issues: WizardValidationIssue[] = [];
  for (let i = 0; i <= LAST_REQUIRED_SECTION_INDEX; i++) {
    const fields = stepFieldErrors(draft, i);
    if (fields.length === 0) continue;
    issues.push({
      step: i,
      stepTitle: LISTING_FORM_SECTIONS[i].title,
      fields,
      messages: fields.map(fieldErrorMessage),
    });
  }
  return issues;
}
