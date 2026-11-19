import { sql } from 'drizzle-orm';
import { searchRows, type SearchExecutor } from '../../modules/search/search-db.js';
import { institutionSeeds } from './universities.js';
import { campusDisplayCorrections, campusNamesAr, institutionExtraAliases, institutionNamesAr, searchLocationSeeds } from './search-catalog.js';

/** Run inside the caller's transaction. Never creates inventory or changes pins. */
export async function seedSearchCatalog(executor: SearchExecutor) {
  const missingTranslations = institutionSeeds.flatMap(inst => [
    ...(!institutionNamesAr[inst.slug] ? [`institution:${inst.slug}`] : []),
    ...inst.campuses.filter(c => !campusNamesAr[c.slug]).map(c => `campus:${c.slug}`),
  ]);
  if (missingTranslations.length) throw new Error(`Missing curated translations: ${missingTranslations.join(', ')}`);
  for (const l of searchLocationSeeds) {
    await executor.execute(sql`
      INSERT INTO search_locations(id,kind,slug,name_en,name_ar,district_en,district_ar,parent_city_id,canonical_area,lat,lng)
      VALUES (${l.id},${l.kind},${l.slug},${l.nameEn},${l.nameAr},${l.districtEn},${l.districtAr},${l.parentCityId},${l.canonicalArea},${l.lat},${l.lng})
      ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name_en=excluded.name_en,name_ar=excluded.name_ar,
        district_en=excluded.district_en,district_ar=excluded.district_ar,parent_city_id=excluded.parent_city_id,
        canonical_area=excluded.canonical_area,lat=excluded.lat,lng=excluded.lng
      WHERE (search_locations.slug,search_locations.name_en,search_locations.name_ar,search_locations.district_en,search_locations.district_ar,
        search_locations.parent_city_id,search_locations.canonical_area,search_locations.lat,search_locations.lng)
        IS DISTINCT FROM (excluded.slug,excluded.name_en,excluded.name_ar,excluded.district_en,excluded.district_ar,
        excluded.parent_city_id,excluded.canonical_area,excluded.lat,excluded.lng)
    `);
    for (const alias of new Set(l.aliases)) {
      await executor.execute(sql`INSERT INTO search_aliases(location_id,alias,normalized,language,source)
        VALUES (${l.id},${alias},'',${/[\u0600-\u06ff]/u.test(alias) ? 'ar' : /[23789]/u.test(alias) ? 'franco' : /[éâè]/iu.test(alias) ? 'fr' : 'en'},'seed')
        ON CONFLICT DO NOTHING`);
    }
  }
  const missingInstitutions: string[] = [], missingCampuses: string[] = [];
  for (const inst of institutionSeeds) {
    const [existing] = await searchRows<{ id: string }>(executor,sql`SELECT id FROM institutions WHERE slug=${inst.slug}`);
    if (!existing) { missingInstitutions.push(inst.slug); continue; }
    await executor.execute(sql`UPDATE institutions SET name_ar=${institutionNamesAr[inst.slug]}
      WHERE id=${existing.id}::uuid AND name_ar IS DISTINCT FROM ${institutionNamesAr[inst.slug]}`);
    for (const campus of inst.campuses) {
      const [row] = await searchRows<{ id: string }>(executor,sql`SELECT id FROM universities WHERE slug=${campus.slug} AND institution_id=${existing.id}::uuid`);
      if (!row) { missingCampuses.push(campus.slug); continue; }
      const correction = campusDisplayCorrections[campus.slug];
      if (correction) {
        await executor.execute(sql`UPDATE universities SET name=${correction.name},city=${correction.city},updated_at=now()
          WHERE id=${row.id}::uuid AND (name,city) IS DISTINCT FROM (${correction.name},${correction.city})`);
      }
      await executor.execute(sql`UPDATE universities SET name_ar=${campusNamesAr[campus.slug]}
        WHERE id=${row.id}::uuid AND name_ar IS DISTINCT FROM ${campusNamesAr[campus.slug]}`);
      for (const alias of [...(institutionExtraAliases[inst.slug] ?? []), ...(correction?.aliases ?? [])]) {
        await executor.execute(sql`INSERT INTO search_aliases(campus_id,alias,normalized,language,source)
          VALUES (${row.id}::uuid,${alias},'',${/[\u0600-\u06ff]/u.test(alias) ? 'ar' : 'en'},'seed') ON CONFLICT DO NOTHING`);
      }
    }
  }
  // Add generated aliases for pre-existing names that did not need a translation update.
  // These refresh functions preserve both seed and manually curated aliases.
  await executor.execute(sql`SELECT search_refresh_campus_aliases(id) FROM universities
    WHERE NOT EXISTS (SELECT 1 FROM search_aliases a WHERE a.campus_id=universities.id AND a.source='canonical')`);
  await executor.execute(sql`SELECT search_refresh_place_aliases(id) FROM places
    WHERE NOT EXISTS (SELECT 1 FROM search_aliases a WHERE a.place_id=places.id AND a.source='canonical')`);
  const backfilled = await searchRows<{ id: string }>(executor,sql`
    UPDATE places p SET city=c.name_en FROM search_locations a JOIN search_locations c ON c.id=a.parent_city_id
    WHERE a.kind='area' AND a.canonical_area=p.area AND p.city IS NULL RETURNING p.id
  `);
  const counts = await searchRows<{ kind: string; count: number }>(executor,sql`SELECT kind,count(*)::int AS count FROM search_locations GROUP BY kind ORDER BY kind`);
  const aliases = await searchRows<{ source: string; count: number }>(executor,sql`SELECT source,count(*)::int AS count FROM search_aliases GROUP BY source ORDER BY source`);
  const untranslated = await searchRows<{ slug: string }>(executor,sql`SELECT u.slug FROM universities u LEFT JOIN institutions i ON i.id=u.institution_id
    WHERE u.active AND (nullif(btrim(u.name_ar),'') IS NULL OR nullif(btrim(i.name_ar),'') IS NULL) ORDER BY u.slug`);
  const unmapped = await searchRows<{ area: string; count: number }>(executor,sql`SELECT p.area,count(*)::int AS count FROM places p
    WHERE NOT EXISTS(SELECT 1 FROM search_locations a WHERE a.kind='area' AND a.canonical_area=p.area) GROUP BY p.area ORDER BY p.area`);
  return { locations: counts, aliases, missingInstitutions, missingCampuses,
    untranslatedActiveCampuses: untranslated.map(r => r.slug), unmappedPlaces: unmapped, backfilledPlaceCities: backfilled.length };
}
