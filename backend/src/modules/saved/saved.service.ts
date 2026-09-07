import { NotFoundError } from "../../lib/errors.js";
import { listingsRepository } from "../listings/listings.repository.js";
import { savedRepository } from "./saved.repository.js";
import type { ImportSavedInput } from "./saved.schemas.js";

export class SavedService {
  async list(userId: string) {
    return savedRepository.listByUser(userId);
  }

  async isSaved(userId: string, listingId: string) {
    return { saved: await savedRepository.isSaved(userId, listingId) };
  }

  async save(userId: string, listingId: string) {
    const listing = await listingsRepository.findById(listingId);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }
    await savedRepository.save(userId, listingId);
    return { saved: true as const, listingId };
  }

  async unsave(userId: string, listingId: string) {
    await savedRepository.unsave(userId, listingId);
    return { saved: false as const, listingId };
  }

  async importLocal(userId: string, input: ImportSavedInput) {
    return savedRepository.importMany(userId, input.listingIds);
  }
}

export const savedService = new SavedService();
