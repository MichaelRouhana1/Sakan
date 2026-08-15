import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/** Parent university (AUB, LAU, UA). Campuses live in `universities`. */
export const institutions = pgTable("institutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  shortName: varchar("short_name", { length: 32 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  website: varchar("website", { length: 512 }),
  logoUrl: varchar("logo_url", { length: 2048 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
