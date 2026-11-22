// Stage 3 (read-only): candidates.json + decisions.json -> streets.seed.json + REVIEW.md.
// Dedupes with the REAL normalize v2 (installed as a pg_temp function inside a transaction that is rolled back).
// Never writes to search_locations / search_aliases.
//   node osm_review.mjs               regenerate from decisions.json
//   node osm_review.mjs --sync-ticks  first copy ticks edited in REVIEW.md into decisions.json
import fs from 'node:fs';
import path from 'node:path';
import { connect, installTempNormalize, outDir, seedDir, here, GOLDEN } from './lib.mjs';

const cand = JSON.parse(fs.readFileSync(path.join(outDir, 'candidates.json'), 'utf8'));
const curated = JSON.parse(fs.readFileSync(path.join(outDir, 'curated-areas.json'), 'utf8'));
const decisionsPath = path.join(here, 'decisions.json');
const reviewPath = path.join(here, 'REVIEW.md');
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
const areaById = new Map(curated.filter(l => l.kind === 'area').map(a => [a.id, a]));
const areaMeta = new Map(cand.areas.map(a => [a.id, a]));
const cityName = id => curated.find(l => l.id === id)?.name_en ?? id;
const NEAR_THRESHOLD = 0.75;

if (process.argv.includes('--sync-ticks') && fs.existsSync(reviewPath)) {
  const text = fs.readFileSync(reviewPath, 'utf8');
  const box = /- \[( |x|X)\][^`\n]*`((?:hood|alias\+):[^`]+)`/g;
  const hoods = new Set(decisions.approvedHoods), adds = new Set(decisions.approvedAliasAdds);
  for (const m of text.matchAll(box)) {
    const on = m[1] !== ' ', id = m[2];
    const set = id.startsWith('hood:') ? hoods : adds;
    on ? set.add(id) : set.delete(id);
  }
  const numbered = /- \[( |x|X)\] Include numbered-only streets/.exec(text);
  if (numbered) decisions.includeNumberedOnlyStreets = numbered[1] !== ' ';
  decisions.approvedHoods = [...hoods].sort();
  decisions.approvedAliasAdds = [...adds].sort();
  fs.writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2) + '\n');
  console.log('synced ticks from REVIEW.md into decisions.json');
}

const sql = connect();
const rollback = Object.assign(new Error('rollback'), { rollback: true });
let R;
try {
  await sql.begin(async tx => {
    const fn = await installTempNormalize(tx);
    const norm = async strings => {
      const rows = await tx.unsafe(`SELECT s, ${fn}(s) AS n FROM unnest($1::text[]) s`, [[...new Set(strings)]]);
      return new Map(rows.map(r => [r.s, r.n]));
    };
    const g = await norm(GOLDEN.map(x => x[0]));
    for (const [i, o] of GOLDEN) if (g.get(i) !== o) throw new Error(`golden mismatch ${i} -> ${g.get(i)} (want ${o})`);

    // Existing catalog names (areas, cities, campuses; every language). Places are building labels, excluded.
    const existing = await tx.unsafe(`
      SELECT a.alias, a.language, a.source, a.target_key,
             coalesce(l.kind, 'campus') AS kind, coalesce(l.name_en, u.name) AS target_name, ${fn}(a.alias) AS n
      FROM search_aliases a
      LEFT JOIN search_locations l ON l.id = a.location_id
      LEFT JOIN universities u ON u.id = a.campus_id
      WHERE a.place_id IS NULL AND (l.id IS NULL OR l.kind IN ('city','area'))
        AND a.source IS DISTINCT FROM 'osm'`); // review the manual catalog only, so reruns after an import give the same result
    const exByNorm = new Map();
    for (const e of existing) {
      if (!exByNorm.has(e.n)) exByNorm.set(e.n, []);
      exByNorm.get(e.n).push(e);
    }

    const namesOf = x => [x.nameEn, x.nameAr, ...x.aliases.map(a => a.alias)];
    const N = await norm([...cand.streets, ...cand.hoods].flatMap(namesOf));
    const parityBad = [];
    for (const x of [...cand.streets, ...cand.hoods]) {
      if (N.get(x.nameEn) !== x.primaryNorm) parityBad.push([x.id, 'en', x.nameEn, N.get(x.nameEn), x.primaryNorm]);
      if (N.get(x.nameAr) !== x.primaryNormAr) parityBad.push([x.id, 'ar', x.nameAr, N.get(x.nameAr), x.primaryNormAr]);
    }
    if (parityBad.length) throw new Error(`python/pg normalize parity failed for ${parityBad.length} names, e.g. ${JSON.stringify(parityBad.slice(0, 5))}`);

    const hoodResults = [];
    for (const h of cand.hoods) {
      const ns = [...new Set(namesOf(h).map(s => N.get(s)).filter(Boolean))];
      const exact = [];
      for (const n of ns) for (const e of exByNorm.get(n) ?? []) exact.push({ matched: e.alias, lang: e.language, source: e.source, target: e.target_key, targetName: e.target_name, kind: e.kind, n });
      let near = [];
      if (!exact.length) {
        const rows = await tx.unsafe(`
          SELECT DISTINCT ON (e.target_key) e.alias, e.target_key, coalesce(l.name_en,u.name) AS target_name, similarity(h.n, e.n) AS sim
          FROM unnest($1::text[]) h(n)
          JOIN (SELECT a.alias, a.target_key, a.location_id, a.campus_id, ${fn}(a.alias) AS n FROM search_aliases a WHERE a.place_id IS NULL AND a.source IS DISTINCT FROM 'osm') e
            ON similarity(h.n, e.n) >= ${NEAR_THRESHOLD}
          LEFT JOIN search_locations l ON l.id = e.location_id LEFT JOIN universities u ON u.id = e.campus_id
          ORDER BY e.target_key, similarity(h.n, e.n) DESC`, [ns]);
        near = rows.map(r => ({ matched: r.alias, target: r.target_key, targetName: r.target_name, similarity: Number(Number(r.sim).toFixed(2)) }));
      }
      const aliasAdds = [];
      for (const t of new Set(exact.map(e => e.target))) {
        const have = new Set(existing.filter(e => e.target_key === t).map(e => e.n));
        for (const s of namesOf(h)) {
          const n = N.get(s);
          if (n && !have.has(n) && !aliasAdds.some(a => a.target === t && a.n === n)) aliasAdds.push({ id: `alias+:${t}:${s}`, target: t, alias: s, n });
        }
      }
      hoodResults.push({ ...h, status: exact.length ? 'dupe' : near.length ? 'near-match' : 'proposed', exact, near, aliasAdds });
    }
    for (const hr of cand.handReview) {
      if (!hr.derivedProposal) continue;
      const d = hr.derivedProposal;
      const slug = d.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const n = (await norm([d.nameEn])).get(d.nameEn);
      const street = cand.streets.find(s => s.id === d.fromStreet);
      hoodResults.push({
        id: `hood:${slug}`, slug, parentAreaId: d.parentAreaId, nameEn: d.nameEn,
        nameAr: (street?.nameAr ?? d.nameEn).replace(/^شارع\s+/, ''), aliases: [], osmIds: [], places: [],
        lat: d.lat, lng: d.lng, flags: ['derived-from-street-not-an-osm-place'], radiusM: areaMeta.get(d.parentAreaId).radiusM,
        origin: 'derived-from-street', derivedFromStreet: d.fromStreet, primaryNorm: n, primaryNormAr: '',
        status: (exByNorm.get(n) ?? []).length ? 'dupe' : 'proposed', exact: [], near: [], aliasAdds: [],
      });
    }

    // Extra curated aliases requested at review time (validated against current street ids).
    for (const [sid, list] of Object.entries(decisions.extraStreetAliases ?? {})) {
      if (!cand.streets.some(s => s.id === sid)) throw new Error(`decisions.extraStreetAliases references unknown street ${sid}`);
      const nn = await norm(list.map(a => a.alias));
      for (const a of list) a.n = nn.get(a.alias);
    }

    for (const [hid, list] of Object.entries(decisions.extraHoodAliases ?? {})) {
      if (!cand.hoods.some(h => h.id === hid)) throw new Error(`decisions.extraHoodAliases references unknown hood ${hid}`);
      if (!decisions.approvedHoods.includes(hid)) throw new Error(`decisions.extraHoodAliases targets ${hid}, which is not an approved hood`);
      const nn = await norm(list.map(a => a.alias));
      for (const a of list) a.n = nn.get(a.alias);
    }
    for (const sid of decisions.dropStreets ?? []) {
      if (!cand.streets.some(s => s.id === sid)) throw new Error(`decisions.dropStreets references unknown street ${sid}`);
    }
    const includeNumbered = decisions.includeNumberedOnlyStreets;
    const dropped = new Set(decisions.dropStreets ?? []);
    const included = cand.streets.filter(s => (includeNumbered || !s.flags.includes('numbered-only')) && !dropped.has(s.id));
    const collisions = [];
    const sameScope = new Map();
    for (const s of included) {
      const hits = [];
      for (const n of new Set(namesOf(s).map(x => N.get(x)).filter(Boolean))) for (const e of exByNorm.get(n) ?? []) hits.push(e);
      if (hits.length) collisions.push({ street: s, target: hits[0].target_key, targetName: hits[0].target_name, matched: hits[0].alias });
      const key = `${s.cityId}|${s.primaryNorm}`;
      if (!sameScope.has(key)) sameScope.set(key, []);
      sameScope.get(key).push(s.id);
    }
    R = { hoodResults, collisions, sameScopeDupes: [...sameScope.values()].filter(v => v.length > 1), existingCount: existing.length, included };
    throw rollback;
  });
} catch (e) {
  if (!e.rollback) throw e;
} finally {
  await sql.end();
}

// ======================= output =======================
const allStreets = cand.streets;
const streets = R.included;
const hoods = R.hoodResults;
const approved = new Set(decisions.approvedHoods);
const approvedAdds = new Set(decisions.approvedAliasAdds);
for (const id of approved) if (!hoods.some(h => h.id === id && h.status !== 'dupe')) throw new Error(`decisions.approvedHoods has ${id}, which is not a proposable hood`);
const areaLabel = id => { const a = areaById.get(id); const c = cityName(a.parent_city_id); return a.name_en === c ? c : `${a.name_en}, ${c}`; };
const streetContext = s => (s.multiArea ? cityName(s.cityId) : areaLabel(s.parentAreaId));
const esc = s => String(s).replace(/\|/g, '\\|');
const box = on => (on ? '- [x]' : '- [ ]');
const numbered = allStreets.filter(s => s.flags.includes('numbered-only'));
const flagsCount = {};
for (const s of streets) for (const f of s.flags) flagsCount[f] = (flagsCount[f] ?? 0) + 1;
const perArea = new Map();
for (const s of streets) perArea.set(s.parentAreaId, (perArea.get(s.parentAreaId) ?? 0) + 1);
const extra = decisions.extraStreetAliases ?? {};

// nearest existing curated area (centroid distance), for the hood table
const haversine = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const nearestArea = h => [...areaById.values()].map(a => ({ a, d: haversine(h, { lat: a.lat, lng: a.lng }) })).sort((x, y) => x.d - y.d)[0];

// ---- seed: ONLY approved content ----
const seedHoods = hoods.filter(h => h.status !== 'dupe' && approved.has(h.id));
const seedAliasAdds = hoods.flatMap(h => h.aliasAdds).filter(a => approvedAdds.has(a.id));
const seed = {
  meta: {
    ...cand.meta, generatedBy: 'backend/ops/osm (osm_extract.py, osm_build.py, osm_review.mjs)',
    license: 'Contains data (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright)',
    normalize: 'normalize_v2.sql (st is NOT a generic word)',
    decisions: { includeNumberedOnlyStreets: decisions.includeNumberedOnlyStreets, approvedHoods: [...approved], approvedAliasAdds: [...approvedAdds],
      dropStreets: decisions.dropStreets ?? [], extraHoodAliases: Object.fromEntries(Object.entries(decisions.extraHoodAliases ?? {}).map(([k, v]) => [k, v.map(a => a.alias)])) },
    counts: { streets: streets.length, hoods: seedHoods.length, aliasAdds: seedAliasAdds.length },
  },
  areaRadiusM: Object.fromEntries(cand.areas.map(a => [a.id, a.radiusM])),
  streets: streets.map(s => ({
    id: s.id, slug: s.slug, parentAreaId: s.parentAreaId, cityId: s.cityId, multiArea: s.multiArea,
    nameEn: s.nameEn, nameAr: s.nameAr,
    aliases: [
      ...s.aliases.map(a => ({ alias: a.alias, language: a.language, source: 'osm' })),
      ...(extra[s.id] ?? []).map(a => ({ alias: a.alias, language: a.language, source: 'curated' })),
    ],
    osmIds: s.osmWayIds.map(id => `w${id}`), highway: s.highway, lengthM: s.lengthM, anchorScore: s.anchorScore,
    flags: s.flags, centroid: s.centroid, geom: s.geom,
  })),
  hoods: seedHoods.map(h => ({
    id: h.id, slug: h.slug, parentAreaId: h.parentAreaId, nameEn: h.nameEn, nameAr: h.nameAr,
    aliases: [
      ...h.aliases.map(a => ({ alias: a.alias, language: a.language, source: 'osm' })),
      ...(decisions.extraHoodAliases?.[h.id] ?? []).map(a => ({ alias: a.alias, language: a.language, source: 'curated' })),
    ], osmIds: h.osmIds, origin: h.origin,
    lat: h.lat, lng: h.lng, flags: h.flags,
  })),
  // Shape consumed by seedOsmLocations: additive aliases on existing entries.
  aliasAdds: seedAliasAdds.map(a => ({ targetId: a.target, alias: a.alias, language: /[\u0600-\u06ff]/.test(a.alias) ? 'ar' : 'en' })),
};
fs.mkdirSync(seedDir, { recursive: true });
const seedPath = path.join(seedDir, 'streets.seed.json');
fs.writeFileSync(seedPath, JSON.stringify(seed));
const seedKb = Math.round(fs.statSync(seedPath).size / 1024);

// ---- REVIEW.md ----
const L = [];
const w = (...x) => L.push(...x);
w(`# OSM streets and neighbourhoods: review`, '',
  `Generated from \`decisions.json\` + the OSM extract. The seed (\`backend/src/db/seeds/osm/streets.seed.json\`) contains only what is ticked here.`, '',
  `**To change a decision:** tick or untick a box below, then run \`node backend/ops/osm/osm_review.mjs --sync-ticks\` (copies ticks into \`decisions.json\` and regenerates the seed), then \`npm run db:search:osm-apply\`.`, '',
  `Data: Geofabrik \`${cand.meta.pbf}\` (md5 \`${cand.meta.pbf_md5}\`, file date ${cand.meta.pbf_mtime_utc}). Contains data © OpenStreetMap contributors (ODbL).`, '');

w(`## 1. Numbers`, '', `| | |`, `|---|---|`,
  `| Named highway ways read (residential and above, plus pedestrian/living_street, no service) | ${cand.stats.ways_total_named} |`,
  `| Ways entirely outside every mapped curated-area polygon | ${cand.stats.ways_outside_all_areas} |`,
  `| Streets after merging same-name pieces per city | ${allStreets.length} |`,
  `| Numbered-only streets ("Rue 83") | ${numbered.length} (${decisions.includeNumberedOnlyStreets ? 'included' : 'excluded'}) |`,
  `| **Streets in the seed** | **${streets.length}** |`,
  `| of which span more than one area (shown with the city only) | ${streets.filter(s => s.multiArea).length} |`,
  `| Merged streets dropped for being shorter than ${cand.stats.min_street_length_m} m | ${cand.stats.streets_dropped_shorter_than_30m} |`,
  `| Neighbourhood candidates | ${hoods.length}: ${hoods.filter(h => h.status !== 'dupe').length} proposable, ${hoods.filter(h => h.status === 'dupe').length} dupes |`,
  `| **Neighbourhoods in the seed (ticked)** | **${seedHoods.length}** (${seedHoods.map(h => h.id).join(', ') || 'none'}) |`,
  `| Alias additions to existing entries in the seed (ticked) | ${seedAliasAdds.length} |`,
  `| Existing catalog aliases compared against (areas, cities, campuses; en/ar/fr) | ${R.existingCount} |`,
  `| Seed file size | ${seedKb} KB |`, '',
  `Scope: every named street inside a curated area's mapped polygon. Same-name pieces within one city are one entry with one MultiLineString geometry, parented to the area holding most of the length; different cities stay separate. Anchor density (places + campuses within ${cand.stats.anchor_radius_m} m) only ranks.`, '');

w(`## 2. Radius per area (stored on the area, inherited by its streets and hoods)`, '',
  `Beirut areas **${cand.meta.radius_rule.beirut_m} m**; Matn and all towns **${cand.meta.radius_rule.matn_and_towns_m} m**.`, '',
  `| Area | City | Radius | Polygon | Provenance | km² | Streets parented here | Note |`, `|---|---|---|---|---|---|---|---|`);
for (const a of cand.areas) w(`| ${a.nameEn} (\`${a.id}\`) | ${cityName(a.parentCityId)} | ${a.radiusM} m | ${a.kind} | \`${a.provenance}\` | ${a.areaKm2} | ${perArea.get(a.id) ?? 0} | ${esc(a.note)} |`);
w('', `Maps of the derived circles: \`artifacts/osm-streets/maps/\`.`, '');

w(`## 3. Hand review: Monot, Mar Mikhael, Gemmayzeh, Badaro, Sassine`, '');
for (const hr of cand.handReview) {
  w(`### ${hr.key}`, '');
  const found = hoods.filter(h => hr.hoodCandidates.includes(h.id) || (hr.key === 'Sassine' && h.origin === 'derived-from-street'));
  if (hr.osmNodes.length) for (const n of hr.osmNodes) w(`- OSM place node \`${n.osm}\` (${n.place}) ${esc(JSON.stringify(n.names))} at ${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}`);
  else w(`- No OSM \`place=neighbourhood|suburb\` exists for this name.`);
  for (const p of hr.osmPolygons) w(`- OSM polygon \`${p.osm}\` (admin_level ${p.admin_level ?? '-'}) ${esc(JSON.stringify(p.names))}, ${p.areaKm2} km²`);
  for (const sid of hr.streets) { const s = allStreets.find(x => x.id === sid); if (s) w(`- Street \`${sid}\`: ${s.nameEn} / ${s.nameAr} · ${streetContext(s)}, ${s.lengthM} m${extra[sid] ? `; extra alias ${extra[sid].map(a => `"${a.alias}"`).join(', ')}` : ''}`); }
  for (const h of found) {
    if (h.status === 'dupe') w(`- **Already in the catalog, nothing added.** ` + [...new Set(h.exact.map(e => `\`${e.target}\` via ${e.lang} "${e.matched}"`))].join('; '));
    else w(`- **Proposed neighbourhood${h.origin === 'derived-from-street' ? ' (derived from the street, not an OSM place)' : ''}**, parent ${areaLabel(h.parentAreaId)}, radius ${h.radiusM} m.`, `${box(approved.has(h.id))} \`${h.id}\` ${h.nameEn} / ${h.nameAr}`);
  }
  w('');
}

const proposable = hoods.filter(h => h.status !== 'dupe');
w(`## 4. Proposed neighbourhoods (${proposable.length}): ${proposable.filter(h => approved.has(h.id)).length} ticked`, '',
  `| Approve | id | English / Arabic | Parent area | Nearest existing area | Flags |`, `|---|---|---|---|---|---|`);
for (const h of proposable) {
  const na = nearestArea(h);
  const fl = [...h.flags, ...h.near.map(n => `near "${n.matched}" (${n.targetName}, ${n.similarity})`)].join('; ');
  w(`| ${box(approved.has(h.id))} \`${h.id}\` | ${esc(h.nameEn)} / ${esc(h.nameAr)} | ${areaLabel(h.parentAreaId)} | ${na.a.name_en} (${(na.d / 1000).toFixed(1)} km) | ${esc(fl)} |`);
}
w('');

const dupes = hoods.filter(h => h.status === 'dupe');
w(`## 5. Dupe matches (${dupes.length}): already in the catalog, skipped`, '',
  `| OSM name (en / ar) | OSM ids | Existing entry | Matched via |`, `|---|---|---|---|`);
for (const h of dupes) w(`| ${esc(h.nameEn)} / ${esc(h.nameAr)} | ${h.osmIds.join(', ')} | ${[...new Set(h.exact.map(e => `\`${e.target}\``))].join(', ')} | ${[...new Set(h.exact.map(e => `${e.lang} "${esc(e.matched)}"`))].join(', ')} |`);
w('');

const adds = dupes.flatMap(h => h.aliasAdds.map(a => ({ ...a, from: h })));
w(`## 6. Optional alias additions to existing entries (${adds.length}), additive only`, '',
  `If ticked, inserted as \`source='osm'\` aliases on that entry; the entry itself is never edited.`, '');
for (const a of adds) w(`${box(approvedAdds.has(a.id))} \`${a.id}\` add "${esc(a.alias)}" to \`${a.target}\` (from OSM ${a.from.osmIds.join(', ')})`);
w('');

w(`## 7. Street names equal to an existing area/city/campus name (${R.collisions.length}), kept as streets`, '',
  `Ranking puts the area/campus first; tests pin "Hamra" vs "Hamra Street".`, '',
  `| Street | Shown as | Equals existing | Via |`, `|---|---|---|---|`);
for (const c of R.collisions) w(`| ${esc(c.street.nameEn)} / ${esc(c.street.nameAr)} | ${esc(c.street.nameEn)} · ${streetContext(c.street)} | \`${c.target}\` ${esc(c.targetName)} | ${esc(c.matched)} |`);
w('', R.sameScopeDupes.length ? `**Warning:** same-city streets sharing a normalized name: ${R.sameScopeDupes.map(v => v.join(' = ')).join('; ')}` : `Same-city duplicate check after normalize: none.`, '');

// A ticked neighbourhood and a street that normalize to the same name inside one city.
const cityOfArea = id => areaById.get(id).parent_city_id;
const hoodStreetSame = seedHoods.flatMap(h => streets
  .filter(s => cityOfArea(s.parentAreaId) === cityOfArea(h.parentAreaId) &&
    [h.primaryNorm, h.primaryNormAr].some(n => n && (n === s.primaryNorm || n === s.primaryNormAr)))
  .map(s => ({ h, s })));
w(`## 7b. Ticked neighbourhoods that share a normalized name with a street in the same city (${hoodStreetSame.length})`, '',
  `Dropped streets (decisions.dropStreets): ${(decisions.dropStreets ?? []).map(x => `\`${x}\``).join(', ') || 'none'}. Anything below still shows both rows; add the street id to \`dropStreets\` to keep one.`, '');
for (const { h, s } of hoodStreetSame) w(`- \`${h.id}\` ${esc(h.nameEn)} (${areaLabel(h.parentAreaId)}) and \`${s.id}\` ${esc(s.nameEn)} (${streetContext(s)})`);
w('');

const multi = streets.filter(s => s.multiArea);
w(`## 8. Streets merged across areas (${multi.length}), shown with the city only`, '',
  `| Street | Shown as | Parent (most length) | Length per area |`, `|---|---|---|---|`);
for (const s of multi) w(`| \`${s.id}\` | ${esc(s.nameEn)} · ${cityName(s.cityId)} | ${areaById.get(s.parentAreaId).name_en} | ${Object.entries(s.areaLengthsM).map(([a, l]) => `${areaById.get(a).name_en} ${l} m`).join(', ')} |`);
w('');

w(`## 9. Data quality (streets in the seed)`, '', `| Flag | Streets | Meaning |`, `|---|---|---|`,
  `| english-name-from-french | ${flagsCount['english-name-from-french'] ?? 0} | No usable name:en; the French name is the English display name. No translation. |`,
  `| no-arabic-name | ${flagsCount['no-arabic-name'] ?? 0} | Arabic display falls back to the English text. No transliteration. |`,
  `| no-latin-name | ${flagsCount['no-latin-name'] ?? 0} | English display falls back to the Arabic text |`,
  `| junk-name:en-ignored | ${flagsCount['junk-name:en-ignored'] ?? 0} | A name:en like "Street 60" was ignored as display name |`, '',
  `${box(decisions.includeNumberedOnlyStreets)} Include numbered-only streets (${numbered.length})`, '');

w(`## 10. Streets by area (${streets.length})`, '', `Grouped by parent area, sorted by anchor score then length.`, '');
for (const a of cand.areas) {
  const list = streets.filter(s => s.parentAreaId === a.id).sort((x, y) => y.anchorScore - x.anchorScore || y.lengthM - x.lengthM);
  if (!list.length) continue;
  w(`<details><summary><b>${a.nameEn}</b>: ${list.length} streets, radius ${a.radiusM} m</summary>`, '');
  for (const s of list) w(`- \`${s.id}\` ${esc(s.nameEn)} / ${esc(s.nameAr)} · ${streetContext(s)}, ${s.lengthM} m, anchors ${s.anchors.places}+${s.anchors.campuses}${s.flags.length ? ', ' + s.flags.join(', ') : ''}`);
  w('', `</details>`, '');
}
fs.writeFileSync(reviewPath, L.join('\n'));

// machine-readable summary for the chat table
fs.writeFileSync(path.join(outDir, 'hood-table.json'), JSON.stringify(proposable.map(h => {
  const na = nearestArea(h);
  return { id: h.id, en: h.nameEn, ar: h.nameAr, parent: areaLabel(h.parentAreaId), nearest: na.a.name_en, nearestKm: +(na.d / 1000).toFixed(1), approved: approved.has(h.id), flags: h.flags };
}), null, 1));
fs.writeFileSync(path.join(outDir, 'alias-adds.json'), JSON.stringify(adds.map(a => ({ id: a.id, target: a.target, alias: a.alias, osm: a.from.osmIds })), null, 1));
console.log(JSON.stringify({
  streetsInSeed: streets.length, numberedExcluded: decisions.includeNumberedOnlyStreets ? 0 : numbered.length, multiArea: multi.length,
  hoodsProposable: proposable.length, hoodsInSeed: seedHoods.length, dupes: dupes.length, aliasAdds: adds.length,
  collisions: R.collisions.length, sameScopeDupes: R.sameScopeDupes.length, seedKb,
}, null, 1));
