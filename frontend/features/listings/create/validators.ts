import {
  windowComplete,
  type CutWindow,
} from "@/lib/electricityCuts";
import { numberComplete, numbersFromLegacy } from "@/lib/lebanonPhone";
import type { CreateListingDraft } from "./draft";
import { WIZARD_STEPS } from "@/constants/listingWizard";

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
  water: "Select water status",
  photos: "Add at least 3 photos",
  monthlyRentUsd: "Enter a valid monthly rent",
  securityDepositUsd: "Enter a valid security deposit",
  availableFrom: "Pick an available-from date",
  title: `Title must be ${COPY_TITLE_MIN}–${COPY_TITLE_MAX} characters`,
  description: `Description must be at least ${COPY_DESCRIPTION_MIN} characters`,
  listingPosterRole: "Choose your role",
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
): string[] {
  switch (step) {
    case 0: {
      const errors: string[] = [];
      if (!draft.spaceType) errors.push("spaceType");
      if (!draft.propertyType) errors.push("propertyType");
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
      if (draft.beds < 1) errors.push("beds");
      if (draft.maxOccupancy < 1) errors.push("maxOccupancy");
      return errors;
    }
    case 3: {
      const errors: string[] = [];
      if (!draft.electricity) errors.push("electricity");
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
    case 4:
      return [];
    case 5: {
      const ready = countReadyPhotos(draft);
      if (ready < 3 || draft.photos.some((p) => p.status === "uploading")) {
        return ["photos"];
      }
      return [];
    }
    case 6: {
      const errors: string[] = [];
      const rent = Number(draft.monthlyRentUsd);
      if (!Number.isInteger(rent) || rent <= 0) errors.push("monthlyRentUsd");
      if (draft.depositPreset === "custom") {
        const dep = Number(draft.securityDepositUsd);
        if (!Number.isInteger(dep) || dep < 0) errors.push("securityDepositUsd");
      }
      if (
        !draft.availableImmediate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom)
      ) {
        errors.push("availableFrom");
      }
      return errors;
    }
    case 7: {
      const errors: string[] = [];
      const titleLen = draft.title.trim().length;
      if (titleLen < COPY_TITLE_MIN || titleLen > COPY_TITLE_MAX) {
        errors.push("title");
      }
      if (draft.description.trim().length < COPY_DESCRIPTION_MIN) {
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

export function stepError(draft: CreateListingDraft, step: number): string | null {
  return stepFieldErrors(draft, step).length > 0 ? "invalid" : null;
}

/** Highest step index whose required fields all pass validation. */
export function effectiveCommittedStep(
  draft: CreateListingDraft,
  storedCommittedStep: number,
): number {
  let last = -1;
  const cap = Math.min(storedCommittedStep, WIZARD_STEPS.length - 2);
  for (let i = 0; i <= cap; i++) {
    if (stepFieldErrors(draft, i).length > 0) break;
    last = i;
  }
  return last;
}

/** First wizard step (0–8) with validation errors, searching up to `throughStep` inclusive. */
export function firstInvalidStepIndex(
  draft: CreateListingDraft,
  throughStep = WIZARD_STEPS.length - 2,
): number | null {
  const last = Math.min(throughStep, WIZARD_STEPS.length - 2);
  for (let i = 0; i <= last; i++) {
    if (stepFieldErrors(draft, i).length > 0) return i;
  }
  return null;
}

/** All blocking issues across required wizard steps (excludes review). */
export function wizardPublishIssues(
  draft: CreateListingDraft,
): WizardValidationIssue[] {
  const issues: WizardValidationIssue[] = [];
  for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
    const fields = stepFieldErrors(draft, i);
    if (fields.length === 0) continue;
    issues.push({
      step: i,
      stepTitle: WIZARD_STEPS[i].title,
      fields,
      messages: fields.map(fieldErrorMessage),
    });
  }
  return issues;
}
