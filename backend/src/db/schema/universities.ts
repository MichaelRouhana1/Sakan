import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geographyPoint } from "../types/geography.js";
import { institutions } from "./institutions.js";

/**
 * Campus gate pins. Table name kept so University Hub
 * (`universitySlugs`, map pins, ST_Distance) stays valid.
 */
export const universities = pgTable("universities", {
  id: uuid("id").defaultRandom().primaryKey(),
  institutionId: uuid("institution_id").references(() => institutions.id, {
    onDelete: "restrict",
  }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  city: varchar("city", { length: 128 }),
  address: varchar("address", { length: 256 }),
  /** Campus gate pin (WGS84 geography). */
  location: geographyPoint("location").notNull(),
  isMain: boolean("is_main").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
