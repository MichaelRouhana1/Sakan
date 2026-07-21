import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors.js";
import { listingsRepository } from "../listings/listings.repository.js";
import { reportsRepository } from "./reports.repository.js";
import type { CreateReportInput } from "./reports.schemas.js";

export class ReportsService {
  private assertRenter(role: "renter" | "poster") {
    if (role !== "renter") {
      throw new ForbiddenError("Only renters can report listings");
    }
  }

  async isReported(
    userId: string,
    role: "renter" | "poster",
    listingId: string,
  ) {
    this.assertRenter(role);
    return {
      reported: await reportsRepository.hasReported(userId, listingId),
    };
  }

  async create(
    userId: string,
    role: "renter" | "poster",
    input: CreateReportInput,
  ) {
    this.assertRenter(role);

    const listing = await listingsRepository.findById(input.listingId);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    const already = await reportsRepository.hasReported(
      userId,
      input.listingId,
    );
    if (already) {
      throw new ConflictError("You already reported this listing");
    }

    const row = await reportsRepository.create(
      userId,
      input.listingId,
      input.reason,
    );
    if (!row) {
      throw new ConflictError("You already reported this listing");
    }

    return {
      reported: true as const,
      listingId: row.listingId,
      reason: row.reason,
      id: row.id,
    };
  }
}

export const reportsService = new ReportsService();
