import type {
  WizardDraftPayload,
  WizardDraftSlot,
} from "../../db/schema/listing-wizard-drafts.js";
import {
  listingWizardDraftsRepository,
  type WizardDraftSlots,
} from "./listing-wizard-drafts.repository.js";

export class ListingWizardDraftsService {
  list(userId: string): Promise<WizardDraftSlots> {
    return listingWizardDraftsRepository.listByUser(userId);
  }

  save(
    userId: string,
    slot: WizardDraftSlot,
    payload: WizardDraftPayload,
  ): Promise<WizardDraftPayload> {
    return listingWizardDraftsRepository.saveIfNewer(userId, slot, payload);
  }

  remove(userId: string, slot: WizardDraftSlot): Promise<void> {
    return listingWizardDraftsRepository.remove(userId, slot);
  }
}

export const listingWizardDraftsService = new ListingWizardDraftsService();
