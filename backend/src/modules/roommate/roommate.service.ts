import {
  ROOMMATE_CARD_CREATES_PER_DAY,
  ROOMMATE_INVITES_PER_DAY,
  ROOMMATE_LAUNCH_AREA_SET,
} from "../../constants/roommate.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import { listingsRepository } from "../listings/listings.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { roommateRepository } from "./roommate.repository.js";
import type {
  CreateInviteInput,
  UpsertLookingCardInput,
} from "./roommate.schemas.js";
import {
  END_MATCH_COPY,
  toOwnerCard,
  toSeekerTeaser,
  toUnlockedSeekerCard,
} from "./roommate.serializers.js";

function requireGender(user: { gender: "male" | "female" | null }) {
  if (!user.gender) {
    throw new ValidationError(
      "Set your gender once before using Roommate Finder (used for same-gender matching only)",
    );
  }
  return user.gender;
}

function listingPreview(listing: {
  id: string;
  area: string;
  landmark: string | null;
  monthlyRentUsd: number;
  photos: { url: string }[];
  coverUrl: string | null;
}) {
  return {
    id: listing.id,
    area: listing.area,
    landmark: listing.landmark,
    monthlyRentUsd: listing.monthlyRentUsd,
    coverUrl: listing.coverUrl,
    photoUrls: listing.photos.map((p) => p.url),
  };
}

export class RoommateService {
  async upsertCard(userId: string, input: UpsertLookingCardInput) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    requireGender(user);

    const existing = await roommateRepository.findCardByUser(userId);
    if (!existing) {
      const creates = await roommateRepository.countCardCreatesToday(user.phone);
      if (creates >= ROOMMATE_CARD_CREATES_PER_DAY) {
        throw new ForbiddenError(
          `Looking card create limit (${ROOMMATE_CARD_CREATES_PER_DAY}/day) reached`,
        );
      }
    }

    const card = await roommateRepository.upsertCard(userId, input);
    return toOwnerCard(card);
  }

  async getMyCard(userId: string) {
    const card = await roommateRepository.findCardByUser(userId);
    if (!card) return null;
    return toOwnerCard(card);
  }

  async patchMyCard(
    userId: string,
    patch: {
      areas?: string[];
      budgetMaxUsd?: number;
      sleepSchedule?: UpsertLookingCardInput["sleepSchedule"];
      smoking?: UpsertLookingCardInput["smoking"];
      pets?: UpsertLookingCardInput["pets"];
      moveInTiming?: UpsertLookingCardInput["moveInTiming"];
      contactPhone?: string;
      photoUrls?: string[];
      status?: "active" | "paused" | "withdrawn";
    },
  ) {
    const existing = await roommateRepository.findCardByUser(userId);
    if (!existing) throw new NotFoundError("Looking card not found");

    if (patch.status === "withdrawn") {
      const row = await roommateRepository.withdrawCard(userId);
      return row ? toOwnerCard(row) : null;
    }

    const nextStatus =
      patch.status === "active" || patch.status === "paused"
        ? patch.status
        : existing.status === "paused"
          ? ("paused" as const)
          : ("active" as const);

    const merged: UpsertLookingCardInput = {
      areas: patch.areas ?? existing.areas,
      budgetMaxUsd: patch.budgetMaxUsd ?? existing.budgetMaxUsd,
      sleepSchedule: (patch.sleepSchedule ??
        existing.sleepSchedule) as UpsertLookingCardInput["sleepSchedule"],
      smoking: (patch.smoking ??
        existing.smoking) as UpsertLookingCardInput["smoking"],
      pets: (patch.pets ?? existing.pets) as UpsertLookingCardInput["pets"],
      moveInTiming: (patch.moveInTiming ??
        existing.moveInTiming) as UpsertLookingCardInput["moveInTiming"],
      contactPhone: patch.contactPhone ?? existing.contactPhone,
      photoUrls: patch.photoUrls ?? existing.photoUrls,
      status: nextStatus,
    };
    return this.upsertCard(userId, merged);
  }

  async listSeekers(holderUserId: string, listingId: string) {
    const holder = await usersRepository.findById(holderUserId);
    if (!holder) throw new NotFoundError("User not found");
    const gender = requireGender(holder);

    const listing = await roommateRepository.findListingForHolder(
      listingId,
      holderUserId,
    );
    if (!listing) throw new NotFoundError("Active listing not found");
    if (!listing.lookingForRoommate) {
      throw new ValidationError(
        "Enable Looking for a roommate on this listing first",
      );
    }
    if (!ROOMMATE_LAUNCH_AREA_SET.has(listing.area)) {
      throw new ValidationError(
        "Roommate Finder soft-launch does not include this listing area yet",
      );
    }

    const cards = await roommateRepository.listSeekersForListing({
      holderUserId,
      holderGender: gender,
      listingArea: listing.area,
    });

    // Exclude seekers with open/resolved invite to this holder+listing
    const sent = await roommateRepository.listInvitesSent(holderUserId);
    const excludeCardIds = new Set(
      sent
        .filter(
          (i) =>
            i.listingId === listingId &&
            (i.status === "pending" ||
              i.status === "accepted" ||
              i.status === "declined"),
        )
        .map((i) => i.lookingCardId),
    );

    return cards
      .filter((c) => !excludeCardIds.has(c.id))
      .map(toSeekerTeaser);
  }

  async createInvite(holderUserId: string, input: CreateInviteInput) {
    const holder = await usersRepository.findById(holderUserId);
    if (!holder) throw new NotFoundError("User not found");
    const gender = requireGender(holder);

    const listing = await roommateRepository.findListingForHolder(
      input.listingId,
      holderUserId,
    );
    if (!listing) throw new NotFoundError("Active listing not found");
    if (!listing.lookingForRoommate) {
      throw new ValidationError(
        "Enable Looking for a roommate on this listing first",
      );
    }
    if (!ROOMMATE_LAUNCH_AREA_SET.has(listing.area)) {
      throw new ValidationError(
        "Roommate Finder soft-launch does not include this listing area yet",
      );
    }

    const card = await roommateRepository.findCardById(input.lookingCardId);
    if (!card || card.status !== "active") {
      throw new NotFoundError("Looking card not found");
    }
    if (card.userId === holderUserId) {
      throw new ValidationError("Cannot invite yourself");
    }
    if (!card.areas.includes(listing.area)) {
      throw new ValidationError("Seeker preferred areas do not overlap listing");
    }

    const seeker = await usersRepository.findById(card.userId);
    if (!seeker?.gender || seeker.gender !== gender) {
      throw new ForbiddenError("Seekers are same-gender only");
    }

    const dayCount = await roommateRepository.countPendingInvitesToday(
      holder.phone,
    );
    if (dayCount >= ROOMMATE_INVITES_PER_DAY) {
      throw new ForbiddenError(
        `Daily invite limit (${ROOMMATE_INVITES_PER_DAY}) reached`,
      );
    }

    try {
      const invite = await roommateRepository.createInvite({
        holderUserId,
        seekerUserId: card.userId,
        lookingCardId: card.id,
        listingId: listing.id,
        note: input.note,
      });
      return {
        id: invite.id,
        listingId: invite.listingId,
        lookingCardId: invite.lookingCardId,
        note: invite.note,
        status: invite.status,
        createdAt: invite.createdAt,
        seeker: toSeekerTeaser(card),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        throw new ConflictError("Invite already pending for this seeker");
      }
      throw err;
    }
  }

  async listInbox(seekerUserId: string) {
    const invites = await roommateRepository.listInvitesForSeeker(seekerUserId);
    const out = [];
    for (const invite of invites) {
      const listing = await listingsRepository.findById(invite.listingId);
      out.push({
        id: invite.id,
        status: invite.status,
        note: invite.note,
        createdAt: invite.createdAt,
        listing: listing ? listingPreview(listing) : null,
      });
    }
    return out;
  }

  async listSent(holderUserId: string) {
    const invites = await roommateRepository.listInvitesSent(holderUserId);
    const out = [];
    for (const invite of invites) {
      const card = await roommateRepository.findCardById(invite.lookingCardId);
      const matchId =
        invite.status === "accepted"
          ? await roommateRepository.findMatchIdByInvite(invite.id)
          : null;
      out.push({
        id: invite.id,
        status: invite.status,
        note: invite.note,
        listingId: invite.listingId,
        matchId,
        createdAt: invite.createdAt,
        seeker:
          invite.status === "accepted" && card
            ? toUnlockedSeekerCard(card)
            : card
              ? toSeekerTeaser(card)
              : null,
      });
    }
    return out;
  }

  async acceptInvite(seekerUserId: string, inviteId: string) {
    const invite = await roommateRepository.findInviteById(inviteId);
    if (!invite || invite.seekerUserId !== seekerUserId) {
      throw new NotFoundError("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new ConflictError("Invite is no longer pending");
    }

    await roommateRepository.setInviteStatus(inviteId, "accepted");
    const match = await roommateRepository.createMatch(invite);
    const card = await roommateRepository.findCardById(invite.lookingCardId);
    const listing = await listingsRepository.findById(invite.listingId);
    const holder = await usersRepository.findById(invite.holderUserId);

    return {
      match: {
        id: match.id,
        inviteId: match.inviteId,
        createdAt: match.createdAt,
      },
      listing: listing
        ? {
            ...listingPreview(listing),
            whatsappPhone: holder?.phone ?? null,
          }
        : null,
      seeker: card ? toUnlockedSeekerCard(card) : null,
    };
  }

  async declineInvite(seekerUserId: string, inviteId: string) {
    const invite = await roommateRepository.findInviteById(inviteId);
    if (!invite || invite.seekerUserId !== seekerUserId) {
      throw new NotFoundError("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new ConflictError("Invite is no longer pending");
    }
    await roommateRepository.setInviteStatus(inviteId, "declined");
    return { id: inviteId, status: "declined" as const };
  }

  async getMatch(userId: string, matchId: string) {
    const match = await roommateRepository.findMatchById(matchId);
    if (
      !match ||
      (match.holderUserId !== userId && match.seekerUserId !== userId)
    ) {
      throw new NotFoundError("Match not found");
    }
    const ended = Boolean(match.endedAt);
    const card = await roommateRepository.findCardById(match.lookingCardId);
    const listing = await listingsRepository.findById(match.listingId);
    const holder = await usersRepository.findById(match.holderUserId);

    if (ended) {
      return {
        id: match.id,
        endedAt: match.endedAt,
        endReason: match.endReason,
        endCopy: END_MATCH_COPY,
        listing: listing
          ? { id: listing.id, area: listing.area, landmark: listing.landmark }
          : null,
        seeker: null,
        holderWhatsapp: null,
      };
    }

    return {
      id: match.id,
      endedAt: null,
      listing: listing
        ? {
            ...listingPreview(listing),
            whatsappPhone: holder?.phone ?? null,
          }
        : null,
      seeker: card ? toUnlockedSeekerCard(card) : null,
      parties: {
        holderUserId: match.holderUserId,
        seekerUserId: match.seekerUserId,
      },
    };
  }

  async endMatch(userId: string, matchId: string, reason?: string) {
    const match = await roommateRepository.findMatchById(matchId);
    if (
      !match ||
      (match.holderUserId !== userId && match.seekerUserId !== userId)
    ) {
      throw new NotFoundError("Match not found");
    }
    if (match.endedAt) {
      throw new ConflictError("Match already ended");
    }
    const ended = await roommateRepository.endMatch(matchId, reason);
    return {
      id: ended!.id,
      endedAt: ended!.endedAt,
      endCopy: END_MATCH_COPY,
    };
  }

  async block(blockerUserId: string, blockedUserId: string) {
    if (blockerUserId === blockedUserId) {
      throw new ValidationError("Cannot block yourself");
    }
    await roommateRepository.block(blockerUserId, blockedUserId);
    return { ok: true };
  }

  async report(
    reporterUserId: string,
    input: {
      targetType: "card" | "invite" | "match" | "user";
      targetId: string;
      reason: "spam" | "harassment" | "fake" | "other";
    },
  ) {
    const row = await roommateRepository.report({
      reporterUserId,
      ...input,
    });
    return { id: row.id };
  }

  async nearbyCount(area: string) {
    if (!ROOMMATE_LAUNCH_AREA_SET.has(area)) {
      return { count: 0, area, inLaunch: false };
    }
    const count = await roommateRepository.countNearby(area);
    return { count, area, inLaunch: true };
  }

  async withdrawInvitesForListing(listingId: string) {
    return roommateRepository.withdrawPendingForListing(listingId);
  }
}

export const roommateService = new RoommateService();
