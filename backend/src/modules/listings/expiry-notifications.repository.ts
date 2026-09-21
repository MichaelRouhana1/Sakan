import {
  and,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  listingLifecycleEvents,
  listings,
  notificationDeliveries,
  userPushTokens,
  users,
} from "../../db/schema/index.js";

export type NotificationKind =
  | "pre_expiry"
  | "expiry_prompt"
  | "admin_escalation";
export type NotificationChannel = "push" | "email" | "admin_inbox";

export type ExpiryCandidate = {
  listingId: string;
  posterId: string;
  title: string;
  area: string;
  monthlyRentUsd: number;
  cycleExpiresAt: Date;
  contactName: string;
  whatsappNumber: string | null;
  contactPhone: string | null;
  contactNumbers: unknown;
  userEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  expiryPushEnabled: boolean;
  expiryEmailEnabled: boolean;
  triggerEvent?: "expired" | "renew_intent" | "improve_intent";
};

export type AdminExpiryFollowup = {
  id: string;
  listingId: string;
  cycleExpiresAt: string;
  escalatedAt: string;
  title: string;
  area: string;
  monthlyRentUsd: number;
  listingStatus: string;
  contactName: string;
  whatsappNumber: string | null;
  contactPhone: string | null;
  contactNumbers: unknown;
  posterId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  coverUrl: string | null;
  intent: string | null;
  outcome: string | null;
  deliveryHistory: unknown;
  contacted: boolean;
  queue: "awaiting_host" | "renewal_stalled" | "resolved";
};

const candidateColumns = {
  listingId: listings.id,
  posterId: listings.posterId,
  title: listings.title,
  area: listings.area,
  monthlyRentUsd: listings.monthlyRentUsd,
  cycleExpiresAt: listings.expiresAt,
  contactName: listings.contactName,
  whatsappNumber: listings.whatsappNumber,
  contactPhone: listings.contactPhone,
  contactNumbers: listings.contactNumbers,
  userEmail: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  expiryPushEnabled: users.expiryPushEnabled,
  expiryEmailEnabled: users.expiryEmailEnabled,
};

export class ExpiryNotificationsRepository {
  async preExpiryCandidates(now: Date) {
    const upper = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select(candidateColumns)
      .from(listings)
      .innerJoin(users, eq(users.id, listings.posterId))
      .where(
        and(
          eq(listings.status, "active"),
          lte(listings.expiresAt, upper),
          sql`${listings.expiresAt} > ${now}`,
        ),
      );
    return rows
      .filter((row) => row.cycleExpiresAt != null)
      .map((row) => ({ ...row, cycleExpiresAt: row.cycleExpiresAt! }));
  }

  async dueExpiryCandidates(now: Date) {
    const rows = await db
      .select(candidateColumns)
      .from(listings)
      .innerJoin(users, eq(users.id, listings.posterId))
      .where(
        and(
          eq(listings.status, "active"),
          lte(listings.expiresAt, now),
        ),
      );
    return rows
      .filter((row) => row.cycleExpiresAt != null)
      .map((row) => ({ ...row, cycleExpiresAt: row.cycleExpiresAt! }));
  }

  async ensureExpired(candidate: ExpiryCandidate) {
    return db.transaction(async (tx) => {
      const [final] = await tx
        .select({ id: listingLifecycleEvents.id })
        .from(listingLifecycleEvents)
        .where(
          and(
            eq(listingLifecycleEvents.listingId, candidate.listingId),
            eq(
              listingLifecycleEvents.cycleExpiresAt,
              candidate.cycleExpiresAt,
            ),
            inArray(listingLifecycleEvents.eventType, [
              "rented",
              "renewed",
              "archived",
            ]),
          ),
        )
        .limit(1);
      if (final) return false;

      await tx
        .update(listings)
        .set({ status: "archived", updatedAt: new Date() })
        .where(
          and(
            eq(listings.id, candidate.listingId),
            eq(listings.expiresAt, candidate.cycleExpiresAt),
            eq(listings.status, "active"),
          ),
        );
      const [event] = await tx
        .insert(listingLifecycleEvents)
        .values({
          listingId: candidate.listingId,
          cycleExpiresAt: candidate.cycleExpiresAt,
          eventType: "expired",
          outcome: "unknown",
          source: "system",
        })
        .onConflictDoNothing()
        .returning({ id: listingLifecycleEvents.id });
      return Boolean(event);
    });
  }

  async expiredPromptCandidates() {
    const rows = await db
      .select({
        ...candidateColumns,
        cycleExpiresAt: listingLifecycleEvents.cycleExpiresAt,
      })
      .from(listingLifecycleEvents)
      .innerJoin(listings, eq(listings.id, listingLifecycleEvents.listingId))
      .innerJoin(users, eq(users.id, listings.posterId))
      .where(eq(listingLifecycleEvents.eventType, "expired"));
    return rows
      .filter((row) => row.cycleExpiresAt != null)
      .map((row) => ({ ...row, cycleExpiresAt: row.cycleExpiresAt! }));
  }

  async escalationCandidates(now: Date): Promise<ExpiryCandidate[]> {
    const result = await db.execute(sql`
      WITH cycles AS (
        SELECT DISTINCT listing_id, cycle_expires_at
        FROM listing_lifecycle_events
        WHERE event_type IN ('expired', 'renew_intent', 'improve_intent')
      )
      SELECT
        l.id AS "listingId", l.poster_id AS "posterId", l.title, l.area,
        l.monthly_rent_usd AS "monthlyRentUsd", c.cycle_expires_at AS "cycleExpiresAt",
        l.contact_name AS "contactName", l.whatsapp_number AS "whatsappNumber",
        l.contact_phone AS "contactPhone", l.contact_numbers AS "contactNumbers",
        u.email AS "userEmail", u.first_name AS "firstName", u.last_name AS "lastName",
        u.expiry_push_enabled AS "expiryPushEnabled",
        u.expiry_email_enabled AS "expiryEmailEnabled",
        latest.event_type AS "triggerEvent"
      FROM cycles c
      JOIN listings l ON l.id = c.listing_id
      JOIN users u ON u.id = l.poster_id
      CROSS JOIN LATERAL (
        SELECT e.event_type, e.created_at
        FROM listing_lifecycle_events e
        WHERE e.listing_id = c.listing_id
          AND e.cycle_expires_at = c.cycle_expires_at
          AND e.event_type IN ('expired', 'renew_intent', 'improve_intent')
        ORDER BY e.created_at DESC
        LIMIT 1
      ) latest
      WHERE ${now} >= GREATEST(c.cycle_expires_at, latest.created_at) + interval '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM listing_lifecycle_events f
          WHERE f.listing_id = c.listing_id
            AND f.cycle_expires_at = c.cycle_expires_at
            AND f.event_type IN ('rented', 'renewed', 'archived')
        )
      ORDER BY latest.created_at DESC
    `);
    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      ...(row as unknown as ExpiryCandidate),
      monthlyRentUsd: Number(row.monthlyRentUsd),
      cycleExpiresAt: new Date(String(row.cycleExpiresAt)),
      expiryPushEnabled: Boolean(row.expiryPushEnabled),
      expiryEmailEnabled: Boolean(row.expiryEmailEnabled),
    }));
  }

  async activePushTokens(userId: string) {
    return db
      .select({ token: userPushTokens.token })
      .from(userPushTokens)
      .where(
        and(eq(userPushTokens.userId, userId), eq(userPushTokens.active, true)),
      );
  }

  async claimDelivery(input: {
    listingId: string;
    cycleExpiresAt: Date;
    kind: NotificationKind;
    channel: NotificationChannel;
    recipientKey: string;
    now: Date;
  }) {
    const [created] = await db
      .insert(notificationDeliveries)
      .values({
        listingId: input.listingId,
        cycleExpiresAt: input.cycleExpiresAt,
        kind: input.kind,
        channel: input.channel,
        recipientKey: input.recipientKey,
      })
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    const [retry] = await db
      .update(notificationDeliveries)
      .set({ status: "pending", updatedAt: input.now })
      .where(
        and(
          eq(notificationDeliveries.listingId, input.listingId),
          eq(notificationDeliveries.cycleExpiresAt, input.cycleExpiresAt),
          eq(notificationDeliveries.kind, input.kind),
          eq(notificationDeliveries.channel, input.channel),
          eq(notificationDeliveries.recipientKey, input.recipientKey),
          eq(notificationDeliveries.status, "failed"),
          sql`${notificationDeliveries.attempts} < 3`,
          or(
            isNull(notificationDeliveries.nextAttemptAt),
            lte(notificationDeliveries.nextAttemptAt, input.now),
          ),
        ),
      )
      .returning();
    return retry ?? null;
  }

  async finishDelivery(
    id: string,
    input: {
      status: "sent" | "skipped" | "failed";
      providerMessageId?: string | null;
      error?: string | null;
      retryAt?: Date | null;
    },
  ) {
    const [row] = await db
      .update(notificationDeliveries)
      .set({
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        attempts: sql`${notificationDeliveries.attempts} + 1`,
        lastError: input.error?.slice(0, 2000) ?? null,
        sentAt: input.status === "sent" ? new Date() : null,
        nextAttemptAt: input.retryAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id))
      .returning();
    return row;
  }

  async uncheckedPushReceipts() {
    return db
      .select({
        id: notificationDeliveries.id,
        receiptId: notificationDeliveries.providerMessageId,
        token: notificationDeliveries.recipientKey,
      })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.channel, "push"),
          eq(notificationDeliveries.status, "sent"),
          isNull(notificationDeliveries.receiptCheckedAt),
          sql`${notificationDeliveries.providerMessageId} IS NOT NULL`,
          sql`${notificationDeliveries.sentAt} < now() - interval '15 minutes'`,
          sql`${notificationDeliveries.sentAt} > now() - interval '24 hours'`,
        ),
      )
      .limit(1000);
  }

  async markReceipt(id: string, error?: string) {
    await db
      .update(notificationDeliveries)
      .set({
        receiptCheckedAt: new Date(),
        status: error ? "failed" : "sent",
        lastError: error?.slice(0, 2000) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id));
  }

  async deactivatePushToken(token: string) {
    await db
      .update(userPushTokens)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(userPushTokens.token, token));
  }

  async adminFollowups(): Promise<AdminExpiryFollowup[]> {
    const result = await db.execute(sql`
      SELECT d.id, d.listing_id AS "listingId", d.cycle_expires_at AS "cycleExpiresAt",
        d.created_at AS "escalatedAt", l.title, l.area,
        l.monthly_rent_usd AS "monthlyRentUsd", l.status AS "listingStatus",
        l.contact_name AS "contactName", l.whatsapp_number AS "whatsappNumber",
        l.contact_phone AS "contactPhone", l.contact_numbers AS "contactNumbers",
        u.id AS "posterId", u.first_name AS "firstName", u.last_name AS "lastName",
        u.email,
        (SELECT lp.url FROM listing_photos lp WHERE lp.listing_id = l.id ORDER BY lp.sort_order, lp.created_at LIMIT 1) AS "coverUrl",
        (SELECT e.event_type FROM listing_lifecycle_events e
          WHERE e.listing_id = l.id AND e.cycle_expires_at = d.cycle_expires_at
            AND e.event_type IN ('renew_intent', 'improve_intent')
          ORDER BY e.created_at DESC LIMIT 1) AS intent,
        (SELECT e.outcome FROM listing_lifecycle_events e
          WHERE e.listing_id = l.id AND e.cycle_expires_at = d.cycle_expires_at
            AND e.event_type IN ('rented', 'renewed', 'archived')
          ORDER BY e.created_at DESC LIMIT 1) AS outcome,
        COALESCE((SELECT json_agg(json_build_object(
          'kind', h.kind,
          'channel', h.channel,
          'status', h.status,
          'attempts', h.attempts,
          'sentAt', h.sent_at,
          'error', h.last_error
        ) ORDER BY h.created_at)
          FROM notification_deliveries h
          WHERE h.listing_id = l.id AND h.cycle_expires_at = d.cycle_expires_at
        ), '[]'::json) AS "deliveryHistory",
        EXISTS(SELECT 1 FROM listing_lifecycle_events e
          WHERE e.listing_id = l.id AND e.cycle_expires_at = d.cycle_expires_at
            AND e.event_type = 'admin_contacted') AS contacted
      FROM notification_deliveries d
      JOIN listings l ON l.id = d.listing_id
      JOIN users u ON u.id = l.poster_id
      WHERE d.kind = 'admin_escalation' AND d.channel = 'admin_inbox'
      ORDER BY d.created_at DESC
    `);
    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      ...(row as Record<string, unknown>),
      id: String(row.id),
      listingId: String(row.listingId),
      title: String(row.title),
      area: String(row.area),
      listingStatus: String(row.listingStatus),
      contactName: String(row.contactName),
      whatsappNumber: row.whatsappNumber ? String(row.whatsappNumber) : null,
      contactPhone: row.contactPhone ? String(row.contactPhone) : null,
      contactNumbers: row.contactNumbers,
      posterId: String(row.posterId),
      firstName: row.firstName ? String(row.firstName) : null,
      lastName: row.lastName ? String(row.lastName) : null,
      email: row.email ? String(row.email) : null,
      coverUrl: row.coverUrl ? String(row.coverUrl) : null,
      intent: row.intent ? String(row.intent) : null,
      outcome: row.outcome ? String(row.outcome) : null,
      deliveryHistory: row.deliveryHistory ?? [],
      monthlyRentUsd: Number(row.monthlyRentUsd ?? 0),
      cycleExpiresAt: new Date(String(row.cycleExpiresAt)).toISOString(),
      escalatedAt: new Date(String(row.escalatedAt)).toISOString(),
      contacted: Boolean(row.contacted),
      queue: row.outcome || row.contacted
        ? "resolved"
        : row.intent
          ? "renewal_stalled"
          : "awaiting_host" as const,
    }));
  }

  async markAdminContacted(listingId: string, cycleExpiresAt: Date, note: string) {
    const [row] = await db
      .insert(listingLifecycleEvents)
      .values({
        listingId,
        cycleExpiresAt,
        eventType: "admin_contacted",
        source: "admin",
        metadata: { note },
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }
}

export const expiryNotificationsRepository = new ExpiryNotificationsRepository();
