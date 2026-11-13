import { integer, jsonb, pgTable, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const creationDrafts = pgTable('creation_drafts', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(1),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  result: jsonb('result').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('creation_drafts_owner_status_idx').on(t.ownerId, t.status)]);
