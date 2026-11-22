import { sql } from 'drizzle-orm';
import { searchRows, type SearchExecutor } from '../../modules/search/search-db.js';

type OsmAlias = { alias: string; language: string; source: 'osm' | 'curated' };
type MultiLine = { type: 'MultiLineString'; coordinates: [number, number][][] };
export type OsmStreetSeed = {
  id: string; slug: string; parentAreaId: string; cityId: string; multiArea: boolean;
  nameEn: string; nameAr: string; aliases: OsmAlias[]; osmIds: string[];
  centroid: { lat: number; lng: number }; geom: MultiLine;
};
export type OsmHoodSeed = {
  id: string; slug: string; parentAreaId: string; nameEn: string; nameAr: string;
  aliases: OsmAlias[]; osmIds: string[]; lat: number; lng: number;
};
export type OsmAliasAdd = { targetId: string; alias: string; language: string };
export type OsmSeed = { streets: OsmStreetSeed[]; hoods: OsmHoodSeed[]; aliasAdds: OsmAliasAdd[] };

export class OsmImportError extends Error {
  constructor(message: string, readonly details: unknown) { super(message); }
}

const manualFingerprint = (executor: SearchExecutor) => searchRows<{ locations: string; aliases: string }>(executor, sql`
  SELECT
    (SELECT md5(coalesce(string_agg(to_jsonb(l)::text, '|' ORDER BY l.id), '')) FROM search_locations l WHERE l.source='manual') AS locations,
    (SELECT md5(coalesce(string_agg(concat_ws(':', a.target_key, a.alias, a.normalized, a.language, a.source), '|'
       ORDER BY a.target_key, a.alias, a.source), '')) FROM search_aliases a
     WHERE a.source<>'osm' AND NOT EXISTS (SELECT 1 FROM search_locations o WHERE o.id=a.location_id AND o.source='osm')) AS aliases`);

/**
 * Run inside the caller's transaction. Owns only rows with source='osm' and aliases with source='osm';
 * a manual row is never inserted over, updated, or deleted, and the transaction aborts if one changes.
 */
export async function seedOsmLocations(executor: SearchExecutor, seed: OsmSeed) {
  const rows = [
    ...seed.streets.map(s => ({ id: s.id, kind: 'street', slug: s.slug, name_en: s.nameEn, name_ar: s.nameAr,
      parent_area_id: s.parentAreaId, city_id: s.cityId, osm_ids: s.osmIds, multi_area: s.multiArea,
      lat: s.centroid.lat, lng: s.centroid.lng, geom: s.geom })),
    ...seed.hoods.map(h => ({ id: h.id, kind: 'hood', slug: h.slug, name_en: h.nameEn, name_ar: h.nameAr,
      parent_area_id: h.parentAreaId, city_id: null, osm_ids: h.osmIds, multi_area: false,
      lat: h.lat, lng: h.lng, geom: null })),
  ];
  const aliases = [
    ...[...seed.streets, ...seed.hoods].flatMap(r => r.aliases.map(a => ({ location_id: r.id, alias: a.alias.trim(), language: a.language, source: a.source }))),
    ...seed.aliasAdds.map(a => ({ location_id: a.targetId, alias: a.alias.trim(), language: a.language, source: 'osm' as const })),
  ];
  const ids = new Set<string>();
  for (const r of rows) {
    if (!/^(street|hood):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id) || !r.id.startsWith(r.kind + ':')) throw new OsmImportError('Malformed OSM id', r.id);
    if (ids.has(r.id)) throw new OsmImportError('Duplicate OSM id in seed', r.id);
    ids.add(r.id);
  }
  const input = sql`(SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS r(
    id text, kind text, slug text, name_en text, name_ar text, parent_area_id text, city_id text,
    osm_ids text[], multi_area boolean, lat double precision, lng double precision, geom jsonb))`;
  const aliasInput = sql`(SELECT * FROM jsonb_to_recordset(${JSON.stringify(aliases)}::jsonb) AS r(
    location_id text, alias text, language text, source text))`;

  const before = (await manualFingerprint(executor))[0]!;
  const collisions = await searchRows<{ id: string; existing: string }>(executor, sql`
    SELECT r.id, l.id AS existing FROM ${input} r JOIN search_locations l ON l.id=r.id OR (l.kind=r.kind AND l.slug=r.slug)
    WHERE l.source<>'osm'`);
  if (collisions.length) throw new OsmImportError('OSM rows collide with manual entries', collisions);
  const orphans = await searchRows<{ id: string }>(executor, sql`
    SELECT r.id FROM ${input} r LEFT JOIN search_locations a ON a.id=r.parent_area_id AND a.kind='area' AND a.source='manual'
    WHERE a.id IS NULL OR (r.city_id IS NOT NULL AND r.city_id<>a.parent_city_id)`);
  if (orphans.length) throw new OsmImportError('OSM rows without a curated parent area in the same city', orphans.map(o => o.id));
  const aliasTargets = await searchRows<{ location_id: string }>(executor, sql`
    SELECT DISTINCT r.location_id FROM ${aliasInput} r
    WHERE NOT EXISTS (SELECT 1 FROM search_locations l WHERE l.id=r.location_id)
      AND NOT EXISTS (SELECT 1 FROM ${input} i WHERE i.id=r.location_id)`);
  if (aliasTargets.length) throw new OsmImportError('Alias targets do not exist', aliasTargets.map(a => a.location_id));

  const deleted = await searchRows<{ id: string }>(executor, sql`
    DELETE FROM search_locations l WHERE l.source='osm' AND NOT EXISTS (SELECT 1 FROM ${input} r WHERE r.id=l.id) RETURNING l.id`);
  const upserted = await searchRows<{ inserted: boolean }>(executor, sql`
    INSERT INTO search_locations(id,kind,slug,name_en,name_ar,district_en,district_ar,parent_city_id,parent_area_id,
      lat,lng,geom,osm_ids,multi_area,radius_m,source)
    SELECT r.id,r.kind,r.slug,r.name_en,r.name_ar,a.district_en,a.district_ar,a.parent_city_id,r.parent_area_id,
      r.lat,r.lng,CASE WHEN r.geom IS NOT NULL THEN ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(r.geom),4326))::geography END,
      r.osm_ids,r.multi_area,a.radius_m,'osm'
    FROM ${input} r JOIN search_locations a ON a.id=r.parent_area_id
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name_en=excluded.name_en,name_ar=excluded.name_ar,
      district_en=excluded.district_en,district_ar=excluded.district_ar,parent_city_id=excluded.parent_city_id,
      parent_area_id=excluded.parent_area_id,lat=excluded.lat,lng=excluded.lng,geom=excluded.geom,osm_ids=excluded.osm_ids,
      multi_area=excluded.multi_area,radius_m=excluded.radius_m
    WHERE search_locations.source='osm' AND (search_locations.slug,search_locations.name_en,search_locations.name_ar,
      search_locations.district_en,search_locations.district_ar,search_locations.parent_city_id,search_locations.parent_area_id,
      search_locations.lat,search_locations.lng,ST_AsBinary(search_locations.geom::geometry),search_locations.osm_ids,
      search_locations.multi_area,search_locations.radius_m)
      IS DISTINCT FROM (excluded.slug,excluded.name_en,excluded.name_ar,excluded.district_en,excluded.district_ar,
      excluded.parent_city_id,excluded.parent_area_id,excluded.lat,excluded.lng,ST_AsBinary(excluded.geom::geometry),
      excluded.osm_ids,excluded.multi_area,excluded.radius_m)
    RETURNING (xmax=0) AS inserted`);
  const staleAliases = await searchRows<{ id: string }>(executor, sql`
    DELETE FROM search_aliases a WHERE a.source='osm'
      AND NOT EXISTS (SELECT 1 FROM ${aliasInput} r WHERE r.source='osm' AND r.location_id=a.location_id AND r.alias=a.alias)
    RETURNING a.id`);
  const addedAliases = await searchRows<{ id: string }>(executor, sql`
    INSERT INTO search_aliases(location_id,alias,normalized,language,source)
    SELECT r.location_id,r.alias,'',r.language,r.source FROM ${aliasInput} r
    WHERE r.source IN ('osm','curated') AND length(search_normalize(r.alias))>0
    ON CONFLICT DO NOTHING RETURNING id`);

  const after = (await manualFingerprint(executor))[0]!;
  if (before.locations !== after.locations || before.aliases !== after.aliases) {
    throw new OsmImportError('Manual search entries changed during OSM import', { before, after });
  }
  const counts = await searchRows<{ kind: string; count: number }>(executor, sql`
    SELECT kind, count(*)::int AS count FROM search_locations WHERE source='osm' GROUP BY kind ORDER BY kind`);
  return {
    locations: counts, inserted: upserted.filter(r => r.inserted).length, updated: upserted.filter(r => !r.inserted).length,
    deleted: deleted.map(r => r.id), aliasesAdded: addedAliases.length, aliasesRemoved: staleAliases.length,
    manualFingerprint: after,
  };
}
