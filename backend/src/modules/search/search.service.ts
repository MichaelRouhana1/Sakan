import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { campusHousingRadiusMeters } from '../campus/campus.repository.js';
import { normalizeSearch } from './search-normalization.js';
import { searchRows, type SearchExecutor } from './search-db.js';
import type { SearchSuggestion, SearchSuggestResult } from './search.schemas.js';

type SearchDatabase = SearchExecutor & { transaction<T>(fn: (tx: SearchExecutor) => Promise<T>): Promise<T> };
type Entity = {
  targetKey: string; type: SearchSuggestion['type']; id: string; slug: string | null;
  labelEn: string; labelAr: string; contextEn: string; contextAr: string;
  canonicalArea: string | null; canonicalAreas: string[]; lat: number | null; lng: number | null;
  popularity: number;
};
type CacheEntry = { revision: string; expiresAt: number; value: SearchSuggestResult };
const publicUnits = sql`SELECT id,place_id,area,location,expires_at FROM listing_resolved
  WHERE status='active' AND availability<>'rented' AND hidden_reason IS NULL AND expires_at>now()`;

function toSuggestion(row: Entity): SearchSuggestion {
  const base = { id: row.id, label: {en:row.labelEn,ar:row.labelAr}, context: {en:row.contextEn,ar:row.contextAr},
    center: row.lat != null && row.lng != null ? {lat:Number(row.lat),lng:Number(row.lng)} : null };
  if(row.type==='city') return {...base,type:'city',slug:row.slug!,canonicalAreas:row.canonicalAreas,url:`/search?city=${encodeURIComponent(row.slug!)}`};
  if(row.type==='area') return {...base,type:'area',slug:row.slug!,canonicalArea:row.canonicalArea!,url:`/search?areas=${encodeURIComponent(row.canonicalArea!)}`};
  if(row.type==='campus') return {...base,type:'campus',slug:row.slug!,url:`/search?campusId=${encodeURIComponent(row.id)}&universitySlugs=${encodeURIComponent(row.slug!)}`};
  return {...base,type:'place',canonicalArea:row.canonicalArea!,url:`/search?placeId=${encodeURIComponent(row.id)}`};
}

export class SearchService {
  private readonly cache = new Map<string, CacheEntry>();
  constructor(private readonly database: SearchDatabase = db) {}

  async suggest(q: string, limit=10): Promise<SearchSuggestResult> {
    const normalized=await normalizeSearch(this.database,q);
    const defaults=[...normalized].length<2;
    const [state]=await searchRows<{revision:string;expiryMs:number|null}>(this.database,sql`
      SELECT revision::text, (SELECT extract(epoch FROM (min(expires_at)-now()))*1000 FROM (${publicUnits}) u) AS "expiryMs"
      FROM search_catalog_state WHERE singleton`);
    const key=defaults ? `defaults:${limit}` : `${normalized}:${limit}`, now=Date.now();
    const cached=this.cache.get(key);
    if(cached && cached.revision===state!.revision && cached.expiresAt>now) {
      this.cache.delete(key); this.cache.set(key,cached);
      return {...structuredClone(cached.value),query:q,normalizedQuery:normalized};
    }
    const rows=await this.database.transaction(async tx=>{
      await tx.execute(sql`SET LOCAL pg_trgm.similarity_threshold=0.25`);
      await tx.execute(sql`SET LOCAL pg_trgm.word_similarity_threshold=0.6`);
      const prefix=normalized.replace(/[\\%_]/g,ch=>`\\${ch}`)+'%';
      const wordPrefix='% '+prefix;
      const match=defaults ? sql`true` : sql`(a.normalized=${normalized} OR a.normalized LIKE ${prefix} OR a.normalized LIKE ${wordPrefix}
        ${[...normalized].length>=3 ? sql`OR a.normalized % ${normalized} OR a.normalized %> ${normalized}` : sql``})`;
      return searchRows<Entity>(tx,sql`
        WITH live_units AS MATERIALIZED (${publicUnits}),
        entities AS (
          SELECT l.id AS "targetKey",l.kind::text AS type,l.id,l.slug::text,
            l.name_en AS "labelEn",l.name_ar AS "labelAr",
            CASE WHEN l.kind='area' AND parent.name_en<>l.district_en THEN parent.name_en || ', ' || l.district_en ELSE l.district_en END AS "contextEn",
            CASE WHEN l.kind='area' AND parent.name_ar<>l.district_ar THEN parent.name_ar || '، ' || l.district_ar ELSE l.district_ar END AS "contextAr",
            l.canonical_area::text AS "canonicalArea",
            CASE WHEN l.kind='area' THEN ARRAY[l.canonical_area::text] ELSE ARRAY(SELECT child.canonical_area::text FROM search_locations child
              WHERE child.parent_city_id=l.id AND child.active ORDER BY child.canonical_area) END AS "canonicalAreas",
            l.lat,l.lng,
            (SELECT count(*)::int FROM live_units u WHERE u.area=l.canonical_area OR
              (l.kind='city' AND u.area IN(SELECT child.canonical_area FROM search_locations child WHERE child.parent_city_id=l.id AND child.active))) AS popularity
          FROM search_locations l LEFT JOIN search_locations parent ON parent.id=l.parent_city_id
          WHERE l.active AND (l.kind='city' OR parent.active)
            ${defaults ? sql`AND l.kind='area'` : sql`AND NOT(l.kind='area' AND parent.active AND parent.name_en=l.name_en)`}
          UNION ALL
          SELECT 'campus:' || u.id::text,'campus',u.id::text,u.slug::text,
            concat_ws(' — ',i.short_name,u.name),concat_ws(' — ',i.name_ar,u.name_ar),
            CASE WHEN loc.name_en IS NOT NULL AND loc.district_en<>loc.name_en THEN loc.name_en || ', ' || loc.district_en ELSE coalesce(u.city,'Lebanon') END,
            CASE WHEN loc.name_ar IS NOT NULL AND loc.district_ar<>loc.name_ar THEN loc.name_ar || '، ' || loc.district_ar ELSE coalesce(loc.name_ar,'لبنان') END,
            NULL::text,ARRAY[]::text[],ST_Y(u.location::geometry),ST_X(u.location::geometry),
            (SELECT count(*)::int FROM live_units x WHERE x.location IS NOT NULL AND ST_DWithin(x.location,u.location,${campusHousingRadiusMeters}))
          FROM universities u JOIN institutions i ON i.id=u.institution_id
          LEFT JOIN LATERAL(SELECT l.* FROM search_aliases a JOIN search_locations l ON l.id=a.location_id
            WHERE a.normalized=search_normalize(u.city) AND l.active ORDER BY l.kind DESC,l.id LIMIT 1) loc ON true
          WHERE u.active AND i.active AND nullif(btrim(u.name_ar),'') IS NOT NULL AND nullif(btrim(i.name_ar),'') IS NOT NULL
            AND lower(i.slug)<>'lu' AND lower(u.slug) NOT IN('lu','lu-fanar')
            AND lower(i.name) NOT LIKE '%lebanese university%' AND lower(u.name) NOT LIKE '%lebanese university%'
          UNION ALL
          SELECT 'place:' || p.id::text,'place',p.id::text,NULL::text,
            coalesce(nullif(btrim(p.building_name),''),CASE WHEN p.kind='building' THEN 'Building in ' ELSE 'Apartment in ' END || p.area),
            coalesce(nullif(btrim(p.building_name_ar),''),CASE WHEN nullif(btrim(p.building_name),'') IS NOT NULL
              THEN p.building_name || ' — ' || coalesce(loc.name_ar,p.area)
              ELSE CASE WHEN p.kind='building' THEN 'مبنى في ' ELSE 'شقة في ' END || coalesce(loc.name_ar,p.area) END),
            concat_ws(', ',p.area,p.city),concat_ws('، ',loc.name_ar,parent.name_ar),
            p.area::text,ARRAY[p.area::text],ST_Y(p.location::geometry),ST_X(p.location::geometry),
            (SELECT count(*)::int FROM live_units x WHERE x.place_id=p.id)
          FROM places p LEFT JOIN search_locations loc ON loc.canonical_area=p.area AND loc.kind='area'
          LEFT JOIN search_locations parent ON parent.id=loc.parent_city_id
          WHERE NOT p.hidden AND EXISTS(SELECT 1 FROM live_units x WHERE x.place_id=p.id)
        ), matches AS (
          SELECT a.target_key,
            min(CASE WHEN a.normalized=${normalized} THEN 0 WHEN a.normalized LIKE ${prefix} OR a.normalized LIKE ${wordPrefix} THEN 1 ELSE 2 END) AS tier,
            max(CASE WHEN a.normalized=${normalized} OR a.normalized LIKE ${prefix} OR a.normalized LIKE ${wordPrefix} THEN 1
              ELSE greatest(similarity(a.normalized,${normalized}),word_similarity(${normalized},a.normalized)) END) AS score
          FROM search_aliases a WHERE ${match} GROUP BY a.target_key
        )
        SELECT e.* FROM entities e JOIN matches m ON m.target_key=e."targetKey"
        -- Known short institution acronyms should not fill the menu with unrelated fuzzy acronyms.
        WHERE m.tier<2 OR NOT(${normalized} ~ '^[a-z]{2,4}$' AND EXISTS(
          SELECT 1 FROM search_aliases known WHERE known.normalized=${normalized} AND known.source='institution'))
        ORDER BY ${defaults ? sql`e.popularity DESC,e."labelEn",e."targetKey"` : sql`m.tier,m.score DESC,e.popularity DESC,e."labelEn",e."targetKey"`}
        ${defaults ? sql`` : sql`LIMIT ${limit}`}
      `);
    });
    const value:SearchSuggestResult={query:q,normalizedQuery:normalized,mode:defaults?'defaults':'results',minQueryLength:2,
      results:defaults ? [] : rows.map(toSuggestion),sections:{
        topAreas:defaults ? rows.filter(r=>r.type==='area' && r.popularity>0).slice(0,Math.ceil(limit/2)).map(toSuggestion) as SearchSuggestResult['sections']['topAreas'] : [],
        topCampuses:defaults ? rows.filter(r=>r.type==='campus' && r.popularity>0).slice(0,Math.floor(limit/2)).map(toSuggestion) as SearchSuggestResult['sections']['topCampuses'] : [],
      }};
    this.cache.delete(key);
    if(this.cache.size>=500) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,{revision:state!.revision,expiresAt:now+Math.min(60_000,Math.max(0,Number(state!.expiryMs ?? 60_000))),value});
    return structuredClone(value);
  }
}
export const searchService=new SearchService();
