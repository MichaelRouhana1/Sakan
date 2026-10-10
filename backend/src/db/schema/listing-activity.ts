import { bigint, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { listings } from './listings.js';
export const listingActivityCoverage = pgTable('listing_activity_coverage', {
  id: text('id').primaryKey().default('listing_activity'), startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
});
export const listingActivityEvents = pgTable('listing_activity_events', {
  id: uuid('id').primaryKey().defaultRandom(), eventId: uuid('event_id').notNull().unique(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  listingIdSnapshot: uuid('listing_id_snapshot').notNull(), boostId: uuid('boost_id'),
  kind: text('kind').notNull(), actorKey: text('actor_key').notNull(), sessionId: uuid('session_id'),
  platform: text('platform').notNull(), measurement: text('measurement'), dedupeKey: text('dedupe_key').unique(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('listing_activity_listing_time_idx').on(t.listingIdSnapshot, t.occurredAt), index('listing_activity_boost_time_idx').on(t.boostId, t.occurredAt), index('listing_activity_actor_time_idx').on(t.listingIdSnapshot, t.actorKey, t.kind, t.occurredAt)]);
export const promotionSearchAllocations = pgTable('promotion_search_allocations', {
  sessionId: uuid('session_id').notNull(), cohortKey: text('cohort_key').notNull(), campaignIds: jsonb('campaign_ids').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.sessionId, t.cohortKey] })]);
export const promotionRotationCounters = pgTable('promotion_rotation_counters', {
  cohortKey: text('cohort_key').primaryKey(), nextOffset: bigint('next_offset', { mode: 'number' }).notNull().default(0),
});
