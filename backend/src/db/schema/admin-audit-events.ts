import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { adminActorKindEnum } from "./enums.js";

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorKind: adminActorKindEnum("actor_kind").notNull(),
  actorClerkId: varchar("actor_clerk_id", { length: 255 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
