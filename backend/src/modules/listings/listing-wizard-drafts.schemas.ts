import { z } from "zod";
import type { WizardDraftPayload } from "../../db/schema/listing-wizard-drafts.js";

const MAX_DRAFT_JSON_CHARS = 1_500_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const wizardDraftCheckpointSchema: z.ZodType<WizardDraftPayload> =
  z.custom<WizardDraftPayload>((value) => {
    if (!isPlainObject(value)) return false;
    if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) {
      return false;
    }
    if (
      typeof value.committedStep !== "number" ||
      !Number.isInteger(value.committedStep) ||
      value.committedStep < -1 ||
      value.committedStep > 40
    ) {
      return false;
    }
    if (
      value.savedStep != null &&
      (typeof value.savedStep !== "number" ||
        !Number.isInteger(value.savedStep) ||
        value.savedStep < 0 ||
        value.savedStep > 40)
    ) {
      return false;
    }
    if (!isPlainObject(value.draft)) return false;
    try {
      if (JSON.stringify(value).length > MAX_DRAFT_JSON_CHARS) return false;
    } catch {
      return false;
    }
    return true;
  });
