import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  roommateCardStatusEnum,
  roommateInviteStatusEnum,
  roommateMoveInTimingEnum,
  roommateReportReasonEnum,
  roommateReportTargetTypeEnum,
} from "./enums.js";
import { listings } from "./listings.js";
import { users } from "./users.js";

export const roommateLookingCards = pgTable("roommate_looking_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  areas: text("areas").array().notNull(),
  budgetMaxUsd: integer("budget_max_usd").notNull(),
  sleepSchedule: varchar("sleep_schedule", { length: 32 }).notNull(),
  smoking: varchar("smoking", { length: 32 }).notNull(),
  pets: varchar("pets", { length: 32 }).notNull(),
  moveInTiming: roommateMoveInTimingEnum("move_in_timing").notNull(),
  photoUrls: text("photo_urls").array().notNull().default([]),
  contactPhone: varchar("contact_phone", { length: 32 }).notNull(),
  status: roommateCardStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roommateInvites = pgTable("roommate_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  holderUserId: uuid("holder_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seekerUserId: uuid("seeker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lookingCardId: uuid("looking_card_id")
    .notNull()
    .references(() => roommateLookingCards.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  note: varchar("note", { length: 500 }).notNull(),
  status: roommateInviteStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roommateMatches = pgTable("roommate_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviteId: uuid("invite_id")
    .notNull()
    .references(() => roommateInvites.id, { onDelete: "cascade" }),
  holderUserId: uuid("holder_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seekerUserId: uuid("seeker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  lookingCardId: uuid("looking_card_id")
    .notNull()
    .references(() => roommateLookingCards.id, { onDelete: "cascade" }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  endReason: varchar("end_reason", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roommateBlocks = pgTable("roommate_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockerUserId: uuid("blocker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: uuid("blocked_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roommateReports = pgTable("roommate_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterUserId: uuid("reporter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: roommateReportTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: roommateReportReasonEnum("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
