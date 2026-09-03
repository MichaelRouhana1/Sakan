import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { benefitCategoryEnum, benefitRedemptionTypeEnum } from "./enums.js";

/**
 * Verified student discounts / perks. Seeded from `seeds/studentBenefits.ts`.
 *
 * `applicableUniversities` holds institution short names (AUB, LAU, USJ) or the
 * sentinel "ALL" for nationwide/global offers, so a benefit can target several
 * campuses without a join table. Filtering uses the `&&` array-overlap operator
 * against the GIN index below.
 *
 * `redemptionData` is the actual promo code / link / counter instruction and is
 * only served to authenticated callers — see benefits.service.
 */
export const studentBenefits = pgTable(
  "student_benefits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: varchar("company_name", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    category: benefitCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    eligibility: text("eligibility").notNull(),
    redemptionType: benefitRedemptionTypeEnum("redemption_type").notNull(),
    redemptionData: text("redemption_data").notNull(),
    isGlobal: boolean("is_global").notNull().default(false),
    applicableUniversities: text("applicable_universities").array().notNull(),
    locationOrArea: varchar("location_or_area", { length: 256 }),
    sourceUrl: varchar("source_url", { length: 1024 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("student_benefits_company_title").on(table.companyName, table.title),
    index("student_benefits_category_idx").on(table.category),
    index("student_benefits_universities_idx").using(
      "gin",
      table.applicableUniversities,
    ),
  ],
);
