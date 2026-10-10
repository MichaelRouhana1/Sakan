import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { listings } from "./listings.js";
import { users } from "./users.js";

export type PromotionStatus = "queued" | "active" | "paused" | "action_needed" | "completed" | "stopped" | "refunded" | "cancelled";
export const promotionSettings = pgTable("promotion_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
});
export const promotionCampaigns = pgTable("promotion_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  listingIdSnapshot: uuid("listing_id_snapshot").notNull(),
  listingTitle: text("listing_title").notNull(),
  listingPublishedAt: timestamp("listing_published_at", { withTimezone: true }),
  type: text("type").$type<"featured" | "bump">().notNull(),
  productId: text("product_id").notNull(),
  catalogVersion: text("catalog_version").notNull(),
  durationDays: integer("duration_days").notNull(),
  pausable: boolean("pausable").notNull().default(false),
  creditUnits: integer("credit_units").notNull(),
  spentUnits: integer("spent_units").notNull().default(0),
  refundedUnits: integer("refunded_units").notNull().default(0),
  status: text("status").$type<PromotionStatus>().notNull(),
  marketKey: text("market_key").notNull(),
  marketLabel: text("market_label").notNull(),
  slotIndex: integer("slot_index"),
  remainingSeconds: integer("remaining_seconds").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  activeSince: timestamp("active_since", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  undoUntil: timestamp("undo_until", { withTimezone: true }),
  lastBumpedAt: timestamp("last_bumped_at", { withTimezone: true }),
  nextBumpAt: timestamp("next_bump_at", { withTimezone: true }),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  autoRenew: boolean("auto_renew").notNull().default(false),
  stopReason: text("stop_reason"),
  idempotencyKey: text("idempotency_key").notNull(),
  renewedFromId: uuid("renewed_from_id"),
  renewalNotifiedAt: timestamp("renewal_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("promotion_request_uq").on(t.ownerId, t.idempotencyKey),
  uniqueIndex("promotion_open_listing_uq").on(t.listingId).where(sql`${t.status} in ('active','queued','paused','action_needed')`),
  uniqueIndex("promotion_active_slot_uq").on(t.marketKey, t.slotIndex).where(sql`${t.status} = 'active' and ${t.type} = 'featured'`),
  uniqueIndex("promotion_renewed_from_uq").on(t.renewedFromId),
  index("promotion_market_queue_idx").on(t.marketKey, t.status, t.queuedAt),
]);
export const promotionServiceIntervals = pgTable("promotion_service_intervals", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => promotionCampaigns.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (t) => [uniqueIndex("promotion_open_interval_uq").on(t.campaignId).where(sql`${t.endedAt} is null`)]);
export const promotionWalletLedger = pgTable("promotion_wallet_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  campaignId: uuid("campaign_id").references(() => promotionCampaigns.id),
  operationKey: text("operation_key").notNull().unique(),
  deltaUnits: integer("delta_units").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const promotionBumpExecutions = pgTable("promotion_bump_executions", {
  campaignId: uuid("campaign_id").notNull().references(() => promotionCampaigns.id),
  localDate: text("local_date").notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("promotion_bump_day_uq").on(t.campaignId, t.localDate)]);
export const promotionNotifications = pgTable("promotion_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  campaignId: uuid("campaign_id").notNull().references(() => promotionCampaigns.id),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("promotion_notification_uq").on(t.campaignId, t.kind)]);
