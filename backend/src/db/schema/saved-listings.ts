import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { listings } from "./listings.js";
import { users } from "./users.js";

export const savedListings = pgTable(
  "saved_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("saved_listings_user_listing_uidx").on(
      table.userId,
      table.listingId,
    ),
  ],
);
