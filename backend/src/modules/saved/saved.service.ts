import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { listingsRepository } from "../listings/listings.repository.js";
import { savedRepository } from "./saved.repository.js";
import type { ImportSavedInput } from "./saved.schemas.js";

export class SavedService {
  private assertRenter(role: "renter" | "poster") {
    if (role !== "renter") {
      throw new ForbiddenError("Only renters can save listings");
    }
  }

  async list(userId: string, role: "renter" | "poster") {
    this.assertRenter(role);
    return savedRepository.listByUser(userId);
  }

  async isSaved(userId: string, role: "renter" | "poster", listingId: string) {
    this.assertRenter(role);
    return { saved: await savedRepository.isSaved(userId, listingId) };
  }

  async save(userId: string, role: "renter" | "poster", listingId: string) {
    this.assertRenter(role);
    const listing = await listingsRepository.findById(listingId);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }
    await savedRepository.save(userId, listingId);
    return { saved: true as const, listingId };
  }

  async unsave(userId: string, role: "renter" | "poster", listingId: string) {
    this.assertRenter(role);
    await savedRepository.unsave(userId, listingId);
    return { saved: false as const, listingId };
  }

  async importLocal(
    userId: string,
    role: "renter" | "poster",
    input: ImportSavedInput,
  ) {
    this.assertRenter(role);
    return savedRepository.importMany(userId, input.listingIds);
  }
}

export const savedService = new SavedService();
