import {
  windowComplete,
  type CutWindow,
} from "@/lib/electricityCuts";
import { numberComplete, numbersFromLegacy } from "@/lib/lebanonPhone";
import type { CreateListingDraft } from "./draft";

export const COPY_TITLE_MIN = 10;
export const COPY_TITLE_MAX = 60;
export const COPY_DESCRIPTION_MIN = 20;

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
      const ready = draft.photos.filter((p) => p.status === "ready" && p.url);
      if (ready.length < 3 || draft.photos.some((p) => p.status === "uploading")) {
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
