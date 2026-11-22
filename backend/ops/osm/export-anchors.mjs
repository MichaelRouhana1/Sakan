// Read-only export of ranking anchors (places with a pin, active campuses) and the existing catalog
// to ops/osm/out/*.json. Anchors are used ONLY to rank streets, never to exclude them.
import fs from 'node:fs';
import { connect, outDir } from './lib.mjs';

fs.mkdirSync(outDir, { recursive: true });
const sql = connect();
try {
  await sql`SET default_transaction_read_only = on`;
  const places = await sql`SELECT id::text, area, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
    FROM places WHERE location IS NOT NULL AND NOT hidden`;
  const campuses = await sql`SELECT u.id::text, u.slug, ST_Y(u.location::geometry) AS lat, ST_X(u.location::geometry) AS lng
    FROM universities u WHERE u.active AND u.location IS NOT NULL`;
  const live = await sql`SELECT count(*)::int AS n FROM listing_resolved
    WHERE status='active' AND availability<>'rented' AND hidden_reason IS NULL AND expires_at>now()`;
  const areas = await sql`SELECT l.id, l.kind, l.slug, l.name_en, l.name_ar, l.district_en, l.parent_city_id, l.canonical_area, l.lat, l.lng,
      coalesce((SELECT array_agg(DISTINCT a.alias ORDER BY a.alias) FROM search_aliases a
                WHERE a.location_id=l.id AND a.source IS DISTINCT FROM 'osm'),'{}') AS aliases
    FROM search_locations l WHERE l.source IS DISTINCT FROM 'osm' ORDER BY l.kind, l.id`; // manual catalog only: stable across re-imports
  const anchors = [
    ...places.map(r => ({ type: 'place', id: r.id, lat: Number(r.lat), lng: Number(r.lng) })),
    ...campuses.map(r => ({ type: 'campus', id: r.id, slug: r.slug, lat: Number(r.lat), lng: Number(r.lng) })),
  ];
  fs.writeFileSync(`${outDir}/anchors.json`, JSON.stringify({ liveEligibleUnits: live[0].n, anchors }, null, 1));
  fs.writeFileSync(`${outDir}/curated-areas.json`, JSON.stringify(areas, null, 1));
  console.log(`anchors: ${places.length} places, ${campuses.length} campuses; live eligible units: ${live[0].n}`);
  console.log(`catalog rows: ${areas.length} (${areas.filter(a => a.kind === 'area').length} areas)`);
} finally {
  await sql.end();
}
