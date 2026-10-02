import {
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export type WizardDraftSlot = "main" | "working";

/** Wizard checkpoint JSON. `draft` stays loose so incomplete listings still save. */
export type WizardDraftPayload = {
  committedStep: number;
  savedStep?: number;
  savedAt: string;
  draft: Record<string, unknown>;
};

export const listingWizardDrafts = pgTable(
  "listing_wizard_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: varchar("slot", { length: 16 }).$type<WizardDraftSlot>().notNull(),
    payload: jsonb("payload").$type<WizardDraftPayload>().notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("listing_wizard_drafts_user_slot_uidx").on(
      table.userId,
      table.slot,
    ),
  ],
);
