import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { geographyPoint } from "../types/geography.js";

export const universities = pgTable("universities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Campus gate pin (WGS84 geography). */
  location: geographyPoint("location").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
