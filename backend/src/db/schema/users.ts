import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userAccountStatusEnum, userRoleEnum } from "./enums.js";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  role: userRoleEnum("role").notNull(),
  postCredits: integer("post_credits").notNull().default(0),
  boostCredits: integer("boost_credits").notNull().default(0),
  freeCreditClaimed: boolean("free_credit_claimed").notNull().default(false),
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
