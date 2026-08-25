import {
  ForbiddenError,
  InsufficientCreditsError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import { COINCIDENT_METERS } from "../../constants/mapCoincident.js";
import { FREE_SLOT_REPLACEMENTS_PER_MONTH } from "../../constants/listings.js";
import {
  universitiesRepository,
  type CampusMeta,
} from "../universities/universities.repository.js";
import { usersRepository } from "../users/users.repository.js";
import {
  listingsRepository,
  type ListingWithPhotos,
} from "./listings.repository.js";
import type {
  CreateListingInput,
  ListingPropertyFilters,
  ListingSort,
} from "./listings.schemas.js";

export type ListingsListResult = {
  data: ListingWithPhotos[];
  campuses: CampusMeta[];
};

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class ListingsService {
  async getById(id: string) {
    const listing = await listingsRepository.findById(id);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }
    const status = String((listing as { status?: string }).status ?? "");
    if (status === "archived" || status === "removed") {
      throw new NotFoundError("Listing not found");
    }
    return listing;
  }

  /** Coincident / same-building siblings for listing detail. */
  async listNearby(id: string) {
    const rows = await listingsRepository.findNearbyActive(
      id,
      COINCIDENT_METERS,
    );
    if (rows === null) {
      throw new NotFoundError("Listing not found");
    }
    return rows;
  }

  async recordView(
    id: string,
    viewer?: { id: string; role: "renter" | "poster" },
  ) {
    const listing = await listingsRepository.findById(id);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    const posterId = String(
      (listing as { posterId?: string }).posterId ?? "",
    );
    if (viewer?.id && posterId && viewer.id === posterId) {
      return {
        id,
        viewCount: Number((listing as { viewCount?: number }).viewCount ?? 0),
        counted: false as const,
      };
    }

    const updated = await listingsRepository.incrementViewCount(id);
    if (!updated) {
      throw new NotFoundError("Listing not found");
    }
    return {
      id: updated.id,
      viewCount: updated.viewCount,
      counted: true as const,
    };
  }

  async list(params: {
    areas?: string[];
    universitySlugs?: string[];
    sort?: ListingSort;
    electricity?: ListingPropertyFilters["electricity"];
    water?: ListingPropertyFilters["water"];
    wifiIncluded?: boolean;
    listingTypes?: ListingPropertyFilters["listingTypes"];
    minRentUsd?: number | null;
    maxRentUsd?: number | null;
    studentsOnly?: boolean;
    genderRestrictions?: ListingPropertyFilters["genderRestrictions"];
  }): Promise<ListingsListResult> {
    const areas = params.areas ?? [];
    const universitySlugs = params.universitySlugs ?? [];
    const property: ListingPropertyFilters = {
      electricity: params.electricity ?? [],
      water: params.water ?? [],
      wifiIncluded: params.wifiIncluded ?? false,
      listingTypes: params.listingTypes ?? [],
      minRentUsd: params.minRentUsd ?? null,
      maxRentUsd: params.maxRentUsd ?? null,
      studentsOnly: params.studentsOnly ?? false,
      genderRestrictions: params.genderRestrictions ?? [],
    };

    if (universitySlugs.length > 0) {
      const [data, campuses] = await Promise.all([
        listingsRepository.listActiveNearUniversities(
          universitySlugs,
          areas,
          property,
        ),
        universitiesRepository.campusMetaBySlugs(universitySlugs),
      ]);
      return { data, campuses };
    }

    const data = await listingsRepository.listActiveByAreas(
      areas,
      params.sort ?? "newest",
      property,
    );
    return { data, campuses: [] };
  }

  async listMine(posterId: string) {
    return listingsRepository.listByPoster(posterId);
  }

  /** First listing promotes renter → poster (host) in DB. */
  private async ensurePoster(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (user.role === "poster") {
      return user;
    }
    const updated = await usersRepository.updateRole(userId, "poster");
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return updated;
  }

  /**
   * Publish rules: 1 live listing free; 2nd+ costs a post credit.
   * Free-slot replacements capped per calendar month.
   */
  async create(posterId: string, input: CreateListingInput) {
    await this.ensurePoster(posterId);
    if (!input.locationWkt) {
      throw new ValidationError("locationWkt is required");
    }
    if (input.photoUrls.length < 3) {
      throw new ValidationError("At least 3 photos are required");
    }
    if (input.photoUrls.length > 15) {
      throw new ValidationError("Maximum 15 photos allowed");
    }

    const publishNow = input.publishNow !== false;
    const activeBefore = publishNow
      ? await listingsRepository.countActiveByPoster(posterId)
      : 0;
    if (publishNow) {
      await this.assertCanPublish(posterId, activeBefore);
    }

    const created = await listingsRepository.create(posterId, input);
    if (publishNow) {
      await this.consumePublishSlot(posterId, activeBefore);
    }
    return created;
  }

  async archive(posterId: string, listingId: string) {
    const row = await listingsRepository.archiveById(listingId, posterId);
    if (!row) {
      throw new NotFoundError("Active listing not found");
    }
    return listingsRepository.findById(listingId);
  }

  private async assertCanPublish(posterId: string, activeBefore: number) {
    const user = await usersRepository.findById(posterId);
    if (!user) throw new NotFoundError("User not found");
    if (user.accountStatus === "restricted" || user.accountStatus === "banned") {
      throw new ForbiddenError("This account cannot publish listings");
    }

    if (activeBefore === 0) {
      const key = monthKey();
      const used =
        user.freeSlotPublishesMonthKey === key
          ? user.freeSlotPublishesMonth
          : 0;
      if (used >= FREE_SLOT_REPLACEMENTS_PER_MONTH && user.postCredits < 1) {
        throw new InsufficientCreditsError(
          "Free listing replacements used this month — buy a post credit",
        );
      }
      return;
    }

    if (user.postCredits < 1) {
      throw new InsufficientCreditsError(
        "A post credit is required for an additional live listing",
      );
    }
  }

  private async consumePublishSlot(posterId: string, activeBefore: number) {
    const user = await usersRepository.findById(posterId);
    if (!user) return;

    if (activeBefore === 0) {
      const key = monthKey();
      const used =
        user.freeSlotPublishesMonthKey === key
          ? user.freeSlotPublishesMonth
          : 0;
      if (used >= FREE_SLOT_REPLACEMENTS_PER_MONTH) {
        await usersRepository.debitPostCredit(posterId);
      } else {
        await usersRepository.bumpFreeSlotPublish(posterId, key);
      }
      return;
    }

    await usersRepository.debitPostCredit(posterId);
  }
}

export const listingsService = new ListingsService();
