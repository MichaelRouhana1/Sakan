import {
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userAccountStatusEnum, userGenderEnum, userRoleEnum } from "./enums.js";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(),
  /** Legacy phone accounts; nullable for email/password registrations. */
  phone: varchar("phone", { length: 32 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 80 }),
  lastName: varchar("last_name", { length: 80 }),
  dateOfBirth: date("date_of_birth"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
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
