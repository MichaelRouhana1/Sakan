import { sql } from 'drizzle-orm';
import { campusHousingRadiusMeters } from '../campus/campus.repository.js';
import type { SearchSuggestion } from './search.schemas.js';

export type Entity = {
  targetKey: string; type: SearchSuggestion['type']; id: string; slug: string | null;
  labelEn: string; labelAr: string; contextEn: string; contextAr: string;
  canonicalArea: string | null; canonicalAreas: string[]; lat: number | null; lng: number | null;
  popularity: number; thumbnailUrl: string | null;
};
export const publicUnits = sql`SELECT id,place_id,area,location,expires_at FROM listing_resolved
  WHERE status='active' AND availability<>'rented' AND hidden_reason IS NULL AND expires_at>now()`;

export function toSuggestion(row: Entity): SearchSuggestion {
  const base = { thumbnailSource: row.thumbnailUrl ? (row.type==='city'||row.type==='area' ? 'curated' as const : 'listing' as const) : null, eligibleUnitCount: Number(row.popularity), thumbnailUrl: row.thumbnailUrl ?? null, id: row.id, label: {en:row.labelEn,ar:row.labelAr}, context: {en:row.contextEn,ar:row.contextAr},
    center: row.lat != null && row.lng != null ? {lat:Number(row.lat),lng:Number(row.lng)} : null };
  if(row.type==='city') return {...base,type:'city',slug:row.slug!,canonicalAreas:row.canonicalAreas,url:`/search?city=${encodeURIComponent(row.slug!)}`};
  if(row.type==='area') return {...base,type:'area',slug:row.slug!,canonicalArea:row.canonicalArea!,url:`/search?areas=${encodeURIComponent(row.canonicalArea!)}`};
  if(row.type==='campus') return {...base,type:'campus',nearbyRadiusMeters:campusHousingRadiusMeters,slug:row.slug!,url:`/search?campusId=${encodeURIComponent(row.id)}&universitySlugs=${encodeURIComponent(row.slug!)}&radiusKm=${campusHousingRadiusMeters/1000}`};
  return {...base,type:'place',canonicalArea:row.canonicalArea!,url:`/search?placeId=${encodeURIComponent(row.id)}`};
}

/** One public catalog for suggestions and canonical recent-search hydration. */
export function searchEntities(scope: 'defaults' | 'typed' | 'all') {
  return sql`WITH live_units AS MATERIALIZED (${publicUnits}),
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
              (l.kind='city' AND u.area IN(SELECT child.canonical_area FROM search_locations child WHERE child.parent_city_id=l.id AND child.active))) AS popularity,
            nullif(btrim(l.image_url),'') AS "thumbnailUrl"
          FROM search_locations l LEFT JOIN search_locations parent ON parent.id=l.parent_city_id
          WHERE l.active AND (l.kind='city' OR parent.active)
            ${scope==='defaults' ? sql`AND l.kind='area'` : scope==='typed' ? sql`AND NOT(l.kind='area' AND parent.active AND parent.name_en=l.name_en)` : sql``}
          UNION ALL
          SELECT 'campus:' || u.id::text,'campus',u.id::text,u.slug::text,
            concat_ws(' — ',i.short_name,u.name),concat_ws(' — ',i.name_ar,u.name_ar),
            CASE WHEN loc.name_en IS NOT NULL AND loc.district_en<>loc.name_en THEN loc.name_en || ', ' || loc.district_en ELSE coalesce(u.city,'Lebanon') END,
            CASE WHEN loc.name_ar IS NOT NULL AND loc.district_ar<>loc.name_ar THEN loc.name_ar || '، ' || loc.district_ar ELSE coalesce(loc.name_ar,'لبنان') END,
            NULL::text,ARRAY[]::text[],ST_Y(u.location::geometry),ST_X(u.location::geometry),
            (SELECT count(*)::int FROM live_units x WHERE x.location IS NOT NULL AND ST_DWithin(x.location,u.location,${campusHousingRadiusMeters})),NULL::text
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
            (SELECT count(*)::int FROM live_units x WHERE x.place_id=p.id),
            (SELECT photo.url FROM live_units unit JOIN LATERAL (
              SELECT lp.url FROM listing_photos lp WHERE lp.listing_id=unit.id AND NOT lp.flagged
              ORDER BY lp.sort_order,lp.created_at,lp.id LIMIT 1
            ) photo ON true WHERE unit.place_id=p.id ORDER BY unit.expires_at DESC,unit.id LIMIT 1)
          FROM places p LEFT JOIN search_locations loc ON loc.canonical_area=p.area AND loc.kind='area'
          LEFT JOIN search_locations parent ON parent.id=loc.parent_city_id
          WHERE NOT p.hidden AND EXISTS(SELECT 1 FROM live_units x WHERE x.place_id=p.id)
        )`;
}
