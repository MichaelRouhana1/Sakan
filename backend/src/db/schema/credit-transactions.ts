import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  creditBundleTypeEnum,
  creditTxStatusEnum,
  paymentChannelEnum,
} from "./enums.js";
import { users } from "./users.js";

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referenceId: varchar("reference_id", { length: 32 }).notNull().unique(),
  status: creditTxStatusEnum("status").notNull().default("pending"),
  bundleType: creditBundleTypeEnum("bundle_type").notNull(),
  postCreditsDelta: integer("post_credits_delta").notNull().default(0),
  boostCreditsDelta: integer("boost_credits_delta").notNull().default(0),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  channel: paymentChannelEnum("channel").notNull(),
  adminNote: text("admin_note"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
