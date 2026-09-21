import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { listings } from "./listings.js";
import { users } from "./users.js";
import {
  listingLifecycleEventTypeEnum,
  listingOutcomeEnum,
  listingOutcomeSourceEnum,
  notificationChannelEnum,
  notificationDeliveryStatusEnum,
  notificationKindEnum,
} from "./enums.js";

export const listingLifecycleEvents = pgTable(
  "listing_lifecycle_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    cycleExpiresAt: timestamp("cycle_expires_at", { withTimezone: true }).notNull(),
    eventType: listingLifecycleEventTypeEnum("event_type").notNull(),
    outcome: listingOutcomeEnum("outcome"),
    source: listingOutcomeSourceEnum("source").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("listing_lifecycle_cycle_event_uq").on(
      table.listingId,
      table.cycleExpiresAt,
      table.eventType,
    ),
    index("listing_lifecycle_listing_cycle_idx").on(
      table.listingId,
      table.cycleExpiresAt,
      table.createdAt,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    cycleExpiresAt: timestamp("cycle_expires_at", { withTimezone: true }).notNull(),
    kind: notificationKindEnum("kind").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    recipientKey: varchar("recipient_key", { length: 512 }).notNull(),
    status: notificationDeliveryStatusEnum("status")
      .notNull()
      .default("pending"),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    attempts: integer("attempts").notNull().default(0),
    lastError: varchar("last_error", { length: 2000 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receiptCheckedAt: timestamp("receipt_checked_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_delivery_dedupe_uq").on(
      table.listingId,
      table.cycleExpiresAt,
      table.kind,
      table.channel,
      table.recipientKey,
    ),
    index("notification_delivery_retry_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
);

export const userPushTokens = pgTable(
  "user_push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 512 }).notNull(),
    platform: varchar("platform", { length: 16 }).notNull(),
    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_push_tokens_token_uq").on(table.token),
    index("user_push_tokens_user_idx").on(table.userId),
  ],
);
