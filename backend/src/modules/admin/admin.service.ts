import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  adminAuditEvents,
  creditTransactions,
  listingPhotos,
  listingReports,
  listings,
  users,
} from "../../db/schema/index.js";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import type { AdminActor } from "../../middleware/auth.js";
import { writeAudit } from "./admin.audit.js";
import { creditsRepository } from "../credits/credits.repository.js";
import { listingsRepository } from "../listings/listings.repository.js";
import { usersRepository } from "../users/users.repository.js";

type CreditTxStatus = "pending" | "approved" | "rejected" | "expired";

export type ListTransactionsQuery = {
  status?: CreditTxStatus;
  referenceId?: string;
  history?: boolean;
};

export type EnrichedCreditTransaction = {
  id: string;
  referenceId: string;
  status: CreditTxStatus;
  bundleType: string;
  channel: string;
  amountUsdCents: number;
  postCreditsDelta: number;
  boostCreditsDelta: number;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  reviewedBy: { kind: "clerk" | "api_key"; clerkId: string | null } | null;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    postCredits: number;
    boostCredits: number;
    role: "renter" | "poster";
    accountStatus: "active" | "restricted" | "banned";
  };
};

function toEnriched(row: {
  tx: typeof creditTransactions.$inferSelect;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    postCredits: number;
    boostCredits: number;
    role: "renter" | "poster";
    accountStatus: "active" | "restricted" | "banned";
  };
}): EnrichedCreditTransaction {
  const { tx, user } = row;
  return {
    id: tx.id,
    referenceId: tx.referenceId,
    status: tx.status,
    bundleType: tx.bundleType,
    channel: tx.channel,
    amountUsdCents: tx.amountUsdCents,
    postCreditsDelta: tx.postCreditsDelta,
    boostCreditsDelta: tx.boostCreditsDelta,
    adminNote: tx.adminNote,
    createdAt: tx.createdAt,
    reviewedAt: tx.reviewedAt,
    approvedAt: tx.approvedAt,
    reviewedBy: tx.reviewedByKind
      ? { kind: tx.reviewedByKind, clerkId: tx.reviewedByClerkId }
      : null,
    user,
  };
}

function noteFromReview(actor: AdminActor, adminNote?: string): string | undefined {
  const trimmed = adminNote?.trim();
  if (actor.kind === "api_key" && !trimmed) {
    throw new ValidationError("adminNote is required when using x-admin-key");
  }
  return trimmed || undefined;
}

export class AdminService {
  async listTransactions(query: ListTransactionsQuery) {
    const filters = [];
    const referenceId = query.referenceId?.trim();
    if (referenceId) {
      filters.push(eq(creditTransactions.referenceId, referenceId));
    }
    if (query.status) {
      filters.push(eq(creditTransactions.status, query.status));
    } else if (query.history && !referenceId) {
      filters.push(ne(creditTransactions.status, "pending"));
    } else if (!referenceId) {
      filters.push(eq(creditTransactions.status, "pending"));
    }

    const rows = await db
      .select({
        tx: creditTransactions,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          postCredits: users.postCredits,
          boostCredits: users.boostCredits,
          role: users.role,
          accountStatus: users.accountStatus,
        },
      })
      .from(creditTransactions)
      .innerJoin(users, eq(creditTransactions.userId, users.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(creditTransactions.createdAt));

    return rows.map(toEnriched);
  }

  async overview() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [
      pendingRow,
      reportRow,
      listingRow,
      posterRow,
      approvedMonth,
    ] = await Promise.all([
      db
        .select({
          count: count(),
          usdCents: sql<number>`coalesce(sum(${creditTransactions.amountUsdCents}), 0)::int`,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.status, "pending")),
      db
        .select({
          count: sql<number>`count(distinct ${listingReports.listingId})::int`,
        })
        .from(listingReports)
        .where(eq(listingReports.status, "open")),
      db
        .select({ count: count() })
        .from(listings)
        .where(eq(listings.status, "active")),
      db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "poster"), gte(users.createdAt, weekAgo))),
      db
        .select({
          postCredits: sql<number>`coalesce(sum(${creditTransactions.postCreditsDelta}), 0)::int`,
          boostCredits: sql<number>`coalesce(sum(${creditTransactions.boostCreditsDelta}), 0)::int`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.status, "approved"),
            gte(creditTransactions.approvedAt, monthStart),
          ),
        ),
    ]);

    return {
      pendingTxCount: pendingRow[0]?.count ?? 0,
      pendingTxUsdCents: pendingRow[0]?.usdCents ?? 0,
      reportCount: reportRow[0]?.count ?? 0,
      activeListingCount: listingRow[0]?.count ?? 0,
      newPostersThisWeek: posterRow[0]?.count ?? 0,
      postCreditsApprovedThisMonth: approvedMonth[0]?.postCredits ?? 0,
      boostCreditsApprovedThisMonth: approvedMonth[0]?.boostCredits ?? 0,
    };
  }

  async approve(txId: string, actor: AdminActor, adminNote?: string) {
    const note = noteFromReview(actor, adminNote);
    const updated = await creditsRepository.approveTransaction(txId, {
      ...actor,
      adminNote: note,
    });
    if (!updated) {
      throw new AppError(
        409,
        "Transaction not pending or not found",
        "TX_NOT_PENDING",
      );
    }
    const [enriched] = await this.listTransactions({
      referenceId: updated.referenceId,
    });
    return enriched ?? updated;
  }

  async reject(txId: string, actor: AdminActor, adminNote?: string) {
    const trimmed = adminNote?.trim();
    if (!trimmed) {
      throw new ValidationError("adminNote is required to reject a transaction");
    }
    if (actor.kind === "api_key") {
      noteFromReview(actor, trimmed);
    }
    const updated = await creditsRepository.rejectTransaction(txId, {
      ...actor,
      adminNote: trimmed,
    });
    if (!updated) {
      throw new AppError(
        409,
        "Transaction not pending or not found",
        "TX_NOT_PENDING",
      );
    }
    const [enriched] = await this.listTransactions({
      referenceId: updated.referenceId,
    });
    return enriched ?? updated;
  }

  async listReportGroups(status: "open" | "dismissed" | "actioned" = "open") {
    const rows = await db
      .select({
        listingId: listingReports.listingId,
        reason: listingReports.reason,
        createdAt: listingReports.createdAt,
        listingTitle: listings.title,
        listingArea: listings.area,
        listingStatus: listings.status,
        posterId: users.id,
        posterEmail: users.email,
        posterFirstName: users.firstName,
        posterLastName: users.lastName,
        posterAccountStatus: users.accountStatus,
      })
      .from(listingReports)
      .innerJoin(listings, eq(listingReports.listingId, listings.id))
      .innerJoin(users, eq(listings.posterId, users.id))
      .where(eq(listingReports.status, status))
      .orderBy(desc(listingReports.createdAt));

    const groups = new Map<
      string,
      {
        listingId: string;
        title: string;
        area: string;
        listingStatus: string;
        poster: {
          id: string;
          email: string | null;
          firstName: string | null;
          lastName: string | null;
          accountStatus: "active" | "restricted" | "banned";
        };
        reportCount: number;
        reasonCounts: Record<string, number>;
        newestAt: Date;
      }
    >();

    for (const row of rows) {
      const existing = groups.get(row.listingId);
      if (!existing) {
        groups.set(row.listingId, {
          listingId: row.listingId,
          title: row.listingTitle,
          area: row.listingArea,
          listingStatus: row.listingStatus,
          poster: {
            id: row.posterId,
            email: row.posterEmail,
            firstName: row.posterFirstName,
            lastName: row.posterLastName,
            accountStatus: row.posterAccountStatus,
          },
          reportCount: 1,
          reasonCounts: { [row.reason]: 1 },
          newestAt: row.createdAt,
        });
      } else {
        existing.reportCount += 1;
        existing.reasonCounts[row.reason] =
          (existing.reasonCounts[row.reason] ?? 0) + 1;
        if (row.createdAt > existing.newestAt) existing.newestAt = row.createdAt;
      }
    }

    const list = [...groups.values()];
    const ids = list.map((g) => g.listingId);
    const covers = new Map<string, string>();
    if (ids.length > 0) {
      const photos = await db
        .select({
          listingId: listingPhotos.listingId,
          url: listingPhotos.url,
          sortOrder: listingPhotos.sortOrder,
        })
        .from(listingPhotos)
        .where(inArray(listingPhotos.listingId, ids))
        .orderBy(asc(listingPhotos.sortOrder));
      for (const photo of photos) {
        if (!covers.has(photo.listingId)) covers.set(photo.listingId, photo.url);
      }
    }

    return list.map((g) => ({
      ...g,
      coverUrl: covers.get(g.listingId) ?? null,
    }));
  }

  async dismissListingReports(
    listingId: string,
    actor: AdminActor,
    adminNote?: string,
  ) {
    const note = requireNote(adminNote);
    const listing = await listingsRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Listing not found");
    const updated = await markOpenReports(listingId, "dismissed");
    await writeAudit(actor, "report.dismiss", "listing", listingId, {
      adminNote: note,
      reportsUpdated: updated,
    });
    return { listingId, reportsUpdated: updated };
  }

  async getListing(id: string) {
    const listing = await listingsRepository.findById(id);
    if (!listing) throw new NotFoundError("Listing not found");
    const poster = await usersRepository.findById(String(listing.posterId));
    if (!poster) throw new NotFoundError("Poster not found");
    const openReports = await db
      .select({
        id: listingReports.id,
        reason: listingReports.reason,
        createdAt: listingReports.createdAt,
      })
      .from(listingReports)
      .where(
        and(
          eq(listingReports.listingId, id),
          eq(listingReports.status, "open"),
        ),
      )
      .orderBy(desc(listingReports.createdAt));
    return {
      listing,
      poster: {
        id: poster.id,
        email: poster.email,
        firstName: poster.firstName,
        lastName: poster.lastName,
        role: poster.role,
        accountStatus: poster.accountStatus,
        postCredits: poster.postCredits,
        boostCredits: poster.boostCredits,
      },
      openReports,
    };
  }

  async searchListings(query: { q?: string; status?: "draft" | "active" | "archived" | "removed" }) {
    const filters = [];
    const q = query.q?.trim();
    if (query.status) filters.push(eq(listings.status, query.status));
    if (q) {
      const like = `%${q}%`;
      const parts = [
        ilike(listings.title, like),
        ilike(listings.area, like),
        ilike(users.email, like),
      ];
      if (UUID_RE.test(q)) parts.push(eq(listings.id, q));
      filters.push(or(...parts));
    }

    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        area: listings.area,
        status: listings.status,
        monthlyRentUsd: listings.monthlyRentUsd,
        viewCount: listings.viewCount,
        createdAt: listings.createdAt,
        posterId: users.id,
        posterEmail: users.email,
        posterFirstName: users.firstName,
        posterLastName: users.lastName,
        posterAccountStatus: users.accountStatus,
      })
      .from(listings)
      .innerJoin(users, eq(listings.posterId, users.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(listings.createdAt))
      .limit(50);

    const ids = rows.map((r) => r.id);
    const covers = new Map<string, string>();
    if (ids.length > 0) {
      const photos = await db
        .select({
          listingId: listingPhotos.listingId,
          url: listingPhotos.url,
        })
        .from(listingPhotos)
        .where(inArray(listingPhotos.listingId, ids))
        .orderBy(asc(listingPhotos.sortOrder));
      for (const photo of photos) {
        if (!covers.has(photo.listingId)) covers.set(photo.listingId, photo.url);
      }
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      area: row.area,
      status: row.status,
      monthlyRentUsd: row.monthlyRentUsd,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      coverUrl: covers.get(row.id) ?? null,
      poster: {
        id: row.posterId,
        email: row.posterEmail,
        firstName: row.posterFirstName,
        lastName: row.posterLastName,
        accountStatus: row.posterAccountStatus,
      },
    }));
  }

  async archiveListing(id: string, actor: AdminActor, adminNote?: string) {
    const note = noteFromReview(actor, adminNote);
    const updated = await listingsRepository.adminSetStatus(id, "archived");
    if (!updated) {
      throw new AppError(409, "Listing is not active", "LISTING_NOT_ACTIVE");
    }
    const reportsUpdated = await markOpenReports(id, "actioned");
    await writeAudit(actor, "listing.archive", "listing", id, {
      adminNote: note ?? null,
      reportsUpdated,
    });
    return this.getListing(id);
  }

  async removeListing(id: string, actor: AdminActor, adminNote?: string) {
    const note = requireNote(adminNote);
    const existing = await listingsRepository.findById(id);
    if (!existing) throw new NotFoundError("Listing not found");
    const updated = await listingsRepository.adminSetStatus(id, "removed");
    if (!updated) {
      throw new AppError(409, "Draft listings cannot be removed", "LISTING_NOT_REMOVABLE");
    }
    const reportsUpdated = await markOpenReports(id, "actioned");
    await writeAudit(actor, "listing.remove", "listing", id, {
      adminNote: note,
      reportsUpdated,
      refund: false,
    });
    return this.getListing(id);
  }

  async restoreListing(id: string, actor: AdminActor, adminNote?: string) {
    const note = noteFromReview(actor, adminNote);
    const updated = await listingsRepository.adminSetStatus(id, "active");
    if (!updated) {
      throw new AppError(
        409,
        "Only archived listings can be restored",
        "LISTING_NOT_ARCHIVED",
      );
    }
    await writeAudit(actor, "listing.restore", "listing", id, {
      adminNote: note ?? null,
    });
    return this.getListing(id);
  }

  async searchUsers(qRaw?: string) {
    const q = qRaw?.trim();
    const filters = [];
    if (q) {
      const like = `%${q}%`;
      filters.push(
        or(ilike(users.email, like), ilike(users.firstName, like), ilike(users.lastName, like)),
      );
    }

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        accountStatus: users.accountStatus,
        postCredits: users.postCredits,
        boostCredits: users.boostCredits,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(50);

    const counts = await db
      .select({
        posterId: listings.posterId,
        status: listings.status,
        count: count(),
      })
      .from(listings)
      .where(
        rows.length > 0
          ? inArray(
              listings.posterId,
              rows.map((r) => r.id),
            )
          : sql`false`,
      )
      .groupBy(listings.posterId, listings.status);

    const byUser = new Map<string, { active: number; total: number }>();
    for (const row of counts) {
      const cur = byUser.get(row.posterId) ?? { active: 0, total: 0 };
      cur.total += Number(row.count);
      if (row.status === "active") cur.active += Number(row.count);
      byUser.set(row.posterId, cur);
    }

    return rows.map((row) => ({
      ...row,
      activeListingCount: byUser.get(row.id)?.active ?? 0,
      listingCount: byUser.get(row.id)?.total ?? 0,
    }));
  }

  async setUserStatus(
    userId: string,
    status: "active" | "restricted" | "banned",
    actor: AdminActor,
    adminNote?: string,
  ) {
    if (status === "restricted" || status === "banned") {
      requireNote(adminNote);
    } else {
      noteFromReview(actor, adminNote);
    }
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const { updated, removedIds } = await db.transaction(async (tx) => {
      let removedIds: string[] = [];
      if (status === "banned") {
        const removed = await tx
          .update(listings)
          .set({ status: "removed", updatedAt: new Date() })
          .where(
            and(eq(listings.posterId, userId), eq(listings.status, "active")),
          )
          .returning({ id: listings.id });
        removedIds = removed.map((r) => r.id);
        if (removedIds.length > 0) {
          await tx
            .update(listingReports)
            .set({ status: "actioned", reviewedAt: new Date() })
            .where(
              and(
                inArray(listingReports.listingId, removedIds),
                eq(listingReports.status, "open"),
              ),
            );
        }
      }

      const [updated] = await tx
        .update(users)
        .set({ accountStatus: status, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          accountStatus: users.accountStatus,
          postCredits: users.postCredits,
          boostCredits: users.boostCredits,
        });
      return { updated, removedIds };
    });

    if (!updated) throw new NotFoundError("User not found");

    await writeAudit(actor, "user.status", "user", userId, {
      adminNote: adminNote?.trim() ?? null,
      from: user.accountStatus,
      to: status,
      removedListingIds: removedIds,
    });
    return {
      ...updated,
      removedListingIds: removedIds,
    };
  }

  async listAuditEvents(query: {
    action?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }) {
    const filters = [];
    if (query.action) {
      filters.push(eq(adminAuditEvents.action, query.action));
    }
    if (query.entityType) {
      filters.push(eq(adminAuditEvents.entityType, query.entityType));
    }
    if (query.entityId) {
      filters.push(eq(adminAuditEvents.entityId, query.entityId));
    }
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);

    return db
      .select({
        id: adminAuditEvents.id,
        actorKind: adminAuditEvents.actorKind,
        actorClerkId: adminAuditEvents.actorClerkId,
        action: adminAuditEvents.action,
        entityType: adminAuditEvents.entityType,
        entityId: adminAuditEvents.entityId,
        payload: adminAuditEvents.payload,
        createdAt: adminAuditEvents.createdAt,
      })
      .from(adminAuditEvents)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(adminAuditEvents.createdAt))
      .limit(limit);
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireNote(adminNote?: string) {
  const trimmed = adminNote?.trim();
  if (!trimmed) {
    throw new ValidationError("adminNote is required");
  }
  return trimmed;
}

async function markOpenReports(
  listingId: string,
  status: "dismissed" | "actioned",
) {
  const updated = await db
    .update(listingReports)
    .set({ status, reviewedAt: new Date() })
    .where(
      and(
        eq(listingReports.listingId, listingId),
        eq(listingReports.status, "open"),
      ),
    )
    .returning({ id: listingReports.id });
  return updated.length;
}

export const adminService = new AdminService();
