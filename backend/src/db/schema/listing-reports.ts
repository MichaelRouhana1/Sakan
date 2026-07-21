import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { listingReportReasonEnum } from "./enums.js";
import { listings } from "./listings.js";
import { users } from "./users.js";

export const listingReports = pgTable(
  "listing_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: listingReportReasonEnum("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("listing_reports_reporter_listing_uidx").on(
      table.reporterUserId,
      table.listingId,
    ),
  ],
);
