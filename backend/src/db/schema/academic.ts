import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  billingModelEnum,
  creditSystemEnum,
  degreeLevelEnum,
  feePeriodEnum,
} from "./enums.js";
import { institutions } from "./institutions.js";

export const faculties = pgTable(
  "faculties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("faculties_institution_slug").on(table.institutionId, table.slug)],
);

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    degreeLevel: degreeLevelEnum("degree_level").notNull().default("bachelor"),
    billingModel: billingModelEnum("billing_model").notNull().default("per_credit"),
    creditSystem: creditSystemEnum("credit_system").notNull().default("us"),
    defaultCredits: integer("default_credits").notNull().default(15),
    /** Full degree credit requirement (US credits or ECTS). */
    totalCredits: integer("total_credits").notNull().default(120),
    maxBilledCredits: integer("max_billed_credits"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("programs_faculty_slug").on(table.facultyId, table.slug)],
);

export type CreditRateTier = {
  amountUsd: number;
  /** Credits billed at this rate, counting from the start of the major. Last band omits the cap. */
  upToCredits?: number;
};

export const tuitionRates = pgTable(
  "tuition_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    academicYear: varchar("academic_year", { length: 16 }).notNull(),
    amountUsd: integer("amount_usd").notNull(),
    creditTiers: jsonb("credit_tiers").$type<CreditRateTier[]>(),
    sourceUrl: varchar("source_url", { length: 1024 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("tuition_rates_program_year").on(table.programId, table.academicYear),
  ],
);

export const feeItems = pgTable("fee_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  facultyId: uuid("faculty_id").references(() => faculties.id, {
    onDelete: "cascade",
  }),
  programId: uuid("program_id").references(() => programs.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  amountUsd: integer("amount_usd").notNull(),
  period: feePeriodEnum("period").notNull().default("year"),
  academicYear: varchar("academic_year", { length: 16 }).notNull(),
  sourceUrl: varchar("source_url", { length: 1024 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
