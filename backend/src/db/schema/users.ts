import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userAccountStatusEnum, userGenderEnum, userRoleEnum } from "./enums.js";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  role: userRoleEnum("role").notNull(),
  postCredits: integer("post_credits").notNull().default(0),
  boostCredits: integer("boost_credits").notNull().default(0),
  freeCreditClaimed: boolean("free_credit_claimed").notNull().default(false),
  /** YYYY-MM key for free-slot publish count. */
  freeSlotPublishesMonthKey: varchar("free_slot_publishes_month_key", {
    length: 7,
  }),
  freeSlotPublishesMonth: integer("free_slot_publishes_month")
    .notNull()
    .default(0),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  gender: userGenderEnum("gender"),
  accountStatus: userAccountStatusEnum("account_status")
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
