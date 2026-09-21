import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { usersRepository } from "../users/users.repository.js";
import { listingsRepository } from "./listings.repository.js";
import { priceGuideFromAggregate } from "./price-guide.js";
import { listingExpiryRepository } from "./listing-expiry.repository.js";
import type {
  ListingExpiryDecisionInput,
  ListingRenewInput,
} from "./listing-expiry.schemas.js";

function latestState(events: Awaited<ReturnType<typeof listingExpiryRepository.listEvents>>) {
  const outcomeEvent = events.find((event) => event.outcome != null);
  const intentEvent = events.find(
    (event) =>
      event.eventType === "renew_intent" || event.eventType === "improve_intent",
  );
  return {
    outcome: outcomeEvent?.outcome ?? null,
    outcomeAt: outcomeEvent?.createdAt ?? null,
    outcomeSource: outcomeEvent?.source ?? null,
    intent:
      intentEvent?.eventType === "improve_intent"
        ? "improve"
        : intentEvent?.eventType === "renew_intent"
          ? "still_available"
          : null,
    intentAt: intentEvent?.createdAt ?? null,
  };
}

export class ListingExpiryService {
  private async ownedListing(ownerId: string, listingId: string) {
    const listing = await listingsRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Listing not found");
    if (String(listing.posterId) !== ownerId) {
      throw new ForbiddenError("You do not own this listing");
    }
    if (!listing.expiresAt) throw new NotFoundError("Listing has no expiry cycle");
    return listing;
  }

  async view(ownerId: string, listingId: string) {
    const listing = await this.ownedListing(ownerId, listingId);
    const user = await usersRepository.findById(ownerId);
    if (!user) throw new NotFoundError("User not found");
    const cycleExpiresAt = new Date(listing.expiresAt as Date | string);
    const [events, priceAggregate] = await Promise.all([
      listingExpiryRepository.listEvents(listingId, cycleExpiresAt),
      listingsRepository.priceGuideAggregate({
        area: String(listing.area),
        spaceType: listing.spaceType as "entire_place" | "private_room" | "shared_room",
        propertyType: listing.propertyType as "apartment" | "studio" | "dormitory" | "house",
        priceBasis: listing.priceBasis as "per_unit_month" | "per_bed_month" | "per_room_month",
        bedrooms: Number(listing.bedrooms ?? 0),
        excludeListingId: listingId,
      }),
    ]);
    const priceGuide = priceGuideFromAggregate(priceAggregate);
    const whatsappReady = Boolean(
      listing.whatsappNumber ||
        (Array.isArray(listing.contactNumbers) &&
          listing.contactNumbers.some(
            (number: { whatsapp?: boolean }) => number.whatsapp,
          )),
    );
    const priceNeedsReview = Boolean(
      priceGuide &&
        (Number(listing.monthlyRentUsd) < priceGuide.lowUsd ||
          Number(listing.monthlyRentUsd) > priceGuide.highUsd),
    );
    const checklist = [
      {
        id: "photos",
        label: "Use at least 3 clear photos",
        complete: listing.photos.length >= 3,
        editable: false,
      },
      {
        id: "cover",
        label: listing.photos.length > 0
          ? "A cover photo is selected; review its clarity"
          : "Add a clear cover photo",
        complete: listing.photos.length > 0,
        editable: false,
      },
      {
        id: "price",
        label: priceGuide
          ? `Compare your price with $${priceGuide.lowUsd}–$${priceGuide.highUsd}`
          : "Price comparison needs at least 10 similar live listings",
        complete: !priceNeedsReview,
        editable: false,
      },
      {
        id: "whatsapp",
        label: "Confirm a WhatsApp-capable contact number",
        complete: whatsappReady,
        editable: false,
      },
      {
        id: "utilities",
        label: `Power: ${listing.electricity}; water: ${listing.water}; Wi-Fi: ${listing.wifiIncluded ? "included" : "not included"}`,
        complete: Boolean(listing.electricity && listing.water && typeof listing.wifiIncluded === "boolean"),
        editable: false,
      },
      {
        id: "pin",
        label: "Confirm the map pin",
        complete: listing.lng != null && listing.lat != null,
        editable: false,
      },
    ];

    return {
      listing,
      cycleExpiresAt: cycleExpiresAt.toISOString(),
      ...latestState(events),
      postCredits: user.postCredits,
      canRenew: listing.status === "active" || listing.status === "archived",
      priceGuide,
      checklist,
      recommendImprove: checklist.some((item) => !item.complete),
    };
  }

  async decide(ownerId: string, listingId: string, input: ListingExpiryDecisionInput) {
    await this.ownedListing(ownerId, listingId);
    await listingExpiryRepository.recordDecision(listingId, ownerId, input);
    return this.view(ownerId, listingId);
  }

  async renew(ownerId: string, listingId: string, input: ListingRenewInput) {
    await this.ownedListing(ownerId, listingId);
    await listingExpiryRepository.renew(
      listingId,
      ownerId,
      new Date(input.cycleExpiresAt),
    );
    return this.view(ownerId, listingId);
  }
}

export const listingExpiryService = new ListingExpiryService();
