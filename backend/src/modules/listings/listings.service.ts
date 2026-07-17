import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { listingsRepository } from "./listings.repository.js";
import type { CreateListingInput } from "./listings.schemas.js";

export class ListingsService {
  async getById(id: string) {
    const listing = await listingsRepository.findById(id);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }
    return listing;
  }

  async list(params: { area?: string; universitySlug?: string }) {
    if (params.universitySlug) {
      return listingsRepository.listActiveNearUniversity(params.universitySlug);
    }
    return listingsRepository.listActiveByArea(params.area);
  }

  async createDraft(
    posterId: string,
    role: "renter" | "poster",
    input: CreateListingInput,
  ) {
    if (role !== "poster") {
      throw new ForbiddenError("Only posters can create listings");
    }
    return listingsRepository.createDraft(posterId, input);
  }

  /**
   * Publish / renew / boost credit rules live here (Service layer).
   * Stubbed for foundational pass — wire decrements in a later slice.
   */
  async publish(_listingId: string, _posterId: string) {
    throw new Error("Not implemented: publish listing (credit consume + 30d expiry)");
  }
}

export const listingsService = new ListingsService();
