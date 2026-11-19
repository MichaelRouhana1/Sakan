import { sql } from 'drizzle-orm';
import { bigint, boolean, check, doublePrecision, foreignKey, index, pgTable, primaryKey, text, timestamp, unique, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { universities } from './universities.js';
import { places } from './places.js';
import { users } from './users.js';

export const searchCatalogState = pgTable('search_catalog_state', {
  singleton: boolean('singleton').primaryKey().default(true),
  revision: bigint('revision', {mode:'number'}).notNull().default(0),
}, t => [check('search_catalog_state_singleton_check', sql`${t.singleton}`)]);

export const searchLocations = pgTable('search_locations', {
  id: text('id').primaryKey(),
  kind: varchar('kind', { length: 8 }).$type<'city' | 'area'>().notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  districtEn: text('district_en').notNull(),
  districtAr: text('district_ar').notNull(),
  parentCityId: text('parent_city_id').references((): AnyPgColumn => searchLocations.id, { onDelete: 'restrict' }),
  parentCityKind: varchar('parent_city_kind', { length: 8 }).generatedAlwaysAs(sql`CASE WHEN parent_city_id IS NOT NULL THEN 'city' END`),
  canonicalArea: varchar('canonical_area', { length: 128 }).unique(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  active: boolean('active').notNull().default(true),
}, t => [
  unique('search_locations_kind_slug_uq').on(t.kind, t.slug),
  unique('search_locations_id_kind_uq').on(t.id, t.kind),
  foreignKey({ name: 'search_locations_parent_city_fk', columns: [t.parentCityId, t.parentCityKind], foreignColumns: [t.id, t.kind] }),
  check('search_locations_shape', sql`(${t.kind} = 'city' AND ${t.parentCityId} IS NULL AND ${t.canonicalArea} IS NULL) OR (${t.kind} = 'area' AND ${t.parentCityId} IS NOT NULL AND ${t.canonicalArea} IS NOT NULL)`),
  check('search_locations_names', sql`length(btrim(${t.nameEn})) > 0 AND length(btrim(${t.nameAr})) > 0`),
  check('search_locations_coordinates', sql`(${t.lat} IS NULL AND ${t.lng} IS NULL) OR (${t.lat} IS NOT NULL AND ${t.lng} IS NOT NULL AND ${t.lat} BETWEEN -90 AND 90 AND ${t.lng} BETWEEN -180 AND 180)`),
  index('search_locations_parent_idx').on(t.parentCityId),
]);

export const searchAliases = pgTable('search_aliases', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: text('location_id').references(() => searchLocations.id, { onDelete: 'cascade' }),
  campusId: uuid('campus_id').references(() => universities.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').references(() => places.id, { onDelete: 'cascade' }),
  targetKey: text('target_key').generatedAlwaysAs(sql`CASE WHEN location_id IS NOT NULL THEN location_id WHEN campus_id IS NOT NULL THEN 'campus:' || campus_id::text ELSE 'place:' || place_id::text END`),
  alias: text('alias').notNull(),
  normalized: text('normalized').notNull(),
  language: varchar('language', { length: 16 }).notNull().default('und'),
  source: varchar('source', { length: 16 }).$type<'canonical' | 'institution' | 'seed' | 'curated'>().notNull().default('curated'),
}, t => [
  check('search_aliases_one_target', sql`num_nonnulls(${t.locationId}, ${t.campusId}, ${t.placeId}) = 1`),
  check('search_aliases_nonempty', sql`length(${t.normalized}) > 0`),
  check('search_aliases_source', sql`${t.source} IN ('canonical','institution','seed','curated')`),
  unique('search_aliases_target_alias_source_uq').on(t.targetKey, t.alias, t.source),
  index('search_aliases_normalized_idx').on(t.normalized.asc().op('text_pattern_ops')),
  index('search_aliases_trgm_idx').using('gin', t.normalized.op('gin_trgm_ops')),
  index('search_aliases_location_idx').on(t.locationId),
  index('search_aliases_campus_idx').on(t.campusId),
  index('search_aliases_place_idx').on(t.placeId),
]);

export const userSearchRecents = pgTable('user_search_recents', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 8 }).$type<'city' | 'area' | 'campus' | 'place'>().notNull(),
  entityId: text('entity_id').notNull(),
  lastSelectedAt: timestamp('last_selected_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.userId, t.entityType, t.entityId] }),
  check('user_search_recents_type', sql`${t.entityType} IN ('city','area','campus','place')`),
  check('user_search_recents_id', sql`length(btrim(${t.entityId})) > 0`),
  index('user_search_recents_latest_idx').on(t.userId, t.lastSelectedAt.desc()),
]);
