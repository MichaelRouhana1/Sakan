import { sql } from 'drizzle-orm';
import { AppError } from '../../lib/errors.js';
import { searchRows, type SearchExecutor } from './search-db.js';
import { normalizeSearch, searchPhrases } from './search-normalization.js';

export type ResolvedLocation = {
  id: string; kind: 'city' | 'area'; slug: string; nameEn: string; nameAr: string;
  contextEn: string; contextAr: string; parentCityId: string | null; canonicalAreas: string[];
};
type AliasLocation = ResolvedLocation & { matched: string };
export class SearchResolutionError extends AppError {
  constructor(code: 'UNKNOWN_SEARCH_AREA' | 'AMBIGUOUS_SEARCH_LOCATION' | 'UNKNOWN_SEARCH_CITY' | 'INVALID_SEARCH_QUERY', message: string,
    public readonly details: { input: string; candidates: ResolvedLocation[] }[]) { super(400,message,code); }
}
export type ResolvedSearchQuery = {
  normalizedQuery: string; remainingQuery: string; locations: ResolvedLocation[];
  /** null = no location constraint; [] = conflicting constraints, never "all areas". */
  canonicalAreas: string[] | null;
};
export type ResolvedCampus = { id: string; slug: string; nameEn: string; nameAr: string; city: string | null };

const intersect = (a: string[] | null, b: string[] | null) => a === null ? b : b === null ? a : a.filter(area => b.includes(area));
const uniqueLocations = (rows: AliasLocation[]) => [...new Map(rows.map(({ matched: _matched, ...row }) => [row.id,row])).values()];

/** Exact alias resolution only. Fuzzy autocomplete ranking belongs to step 2. */
export class SearchResolver {
  constructor(private readonly executor: SearchExecutor) {}

  /** An institution abbreviation can deliberately identify several campuses. */
  async resolveCampusAliases(input: string): Promise<ResolvedCampus[]> {
    return searchRows<ResolvedCampus>(this.executor,sql`
      SELECT DISTINCT u.id,u.slug,concat_ws(' — ',i.short_name,u.name) AS "nameEn",
        concat_ws(' — ',i.name_ar,u.name_ar) AS "nameAr",u.city
      FROM search_aliases a JOIN universities u ON u.id=a.campus_id JOIN institutions i ON i.id=u.institution_id
      WHERE a.normalized=search_normalize(${input}) AND u.active AND i.active
        AND lower(i.slug)<>'lu' AND lower(u.slug) NOT IN ('lu','lu-fanar')
        AND lower(i.name) NOT LIKE '%lebanese university%' AND lower(u.name) NOT LIKE '%lebanese university%'
      ORDER BY u.slug
    `);
  }

  private async matches(phrases: string[], kind?: 'city' | 'area', cityId?: string): Promise<AliasLocation[]> {
    if (!phrases.length) return [];
    return searchRows<AliasLocation>(this.executor,sql`
      SELECT DISTINCT a.normalized AS matched, l.id,l.kind,l.slug,l.name_en AS "nameEn",l.name_ar AS "nameAr",
        l.district_en AS "contextEn",l.district_ar AS "contextAr",l.parent_city_id AS "parentCityId",
        CASE WHEN l.kind='area' THEN ARRAY[l.canonical_area] ELSE ARRAY(
          SELECT child.canonical_area FROM search_locations child WHERE child.parent_city_id=l.id AND child.active ORDER BY child.canonical_area
        ) END AS "canonicalAreas"
      FROM search_aliases a JOIN search_locations l ON l.id=a.location_id
      LEFT JOIN search_locations parent ON parent.id=l.parent_city_id
      WHERE a.normalized IN (${sql.join(phrases.map(p => sql`${p}`),sql`,`)}) AND l.active
        AND (l.kind='city' OR parent.active)
        ${kind ? sql`AND l.kind=${kind}` : sql``}
        ${cityId ? sql`AND (l.parent_city_id=${cityId} OR l.id=${cityId})` : sql``}
      ORDER BY l.id
    `);
  }

  async resolveCity(input: string): Promise<ResolvedLocation> {
    const normalized = await normalizeSearch(this.executor,input);
    const candidates = uniqueLocations(await this.matches([normalized],'city'));
    if (!candidates.length) throw new SearchResolutionError('UNKNOWN_SEARCH_CITY','Unknown city',[{input,candidates}]);
    if (candidates.length > 1) throw new SearchResolutionError('AMBIGUOUS_SEARCH_LOCATION','City alias is ambiguous',[{input,candidates}]);
    return candidates[0]!;
  }

  async resolveAreaFilters(inputs: string[], cityId?: string): Promise<{ canonicalAreas: string[]; locations: ResolvedLocation[] }> {
    const normalized = await searchRows<{ input: string; normalized: string }>(this.executor,sql`
      SELECT input,search_normalize(input) AS normalized FROM unnest(${sql.param(inputs)}::text[]) input`);
    const matches = await this.matches(normalized.map(row => row.normalized),'area',cityId);
    const locations: ResolvedLocation[] = [], unknown: {input:string;candidates:ResolvedLocation[]}[] = [];
    for (const row of normalized) {
      const candidates = uniqueLocations(matches.filter(m => m.matched === row.normalized));
      if (!candidates.length) unknown.push({input:row.input,candidates});
      else if (candidates.length > 1) throw new SearchResolutionError('AMBIGUOUS_SEARCH_LOCATION','Area alias is ambiguous',[{input:row.input,candidates}]);
      else locations.push(candidates[0]!);
    }
    if (unknown.length) throw new SearchResolutionError('UNKNOWN_SEARCH_AREA','Unknown area(s)',unknown);
    return {canonicalAreas:[...new Set(locations.flatMap(l => l.canonicalAreas))],locations:[...new Map(locations.map(l => [l.id,l])).values()]};
  }

  async resolveQuery(input: string): Promise<ResolvedSearchQuery> {
    if ([...input].length > 128) throw new SearchResolutionError('INVALID_SEARCH_QUERY','Search query is too long',[]);
    const normalizedQuery = await normalizeSearch(this.executor,input);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    if (tokens.length > 24) throw new SearchResolutionError('INVALID_SEARCH_QUERY','Search query is too long',[]);
    const phrases = searchPhrases(normalizedQuery);
    const matches = await this.matches([...new Set(phrases.map(p => p.text))]);
    const used = new Set<number>(), locations: ResolvedLocation[] = [];
    for (const phrase of phrases) {
      if (Array.from({length:phrase.end-phrase.start},(_,i) => phrase.start+i).some(i => used.has(i))) continue;
      let candidates = uniqueLocations(matches.filter(row => row.matched === phrase.text));
      // Prefer the city for its same-named legacy area (e.g. Jounieh, which
      // also contains Kaslik), or for an otherwise identical town footprint.
      candidates = candidates.filter(candidate => candidate.kind !== 'area' || !candidates.some(city =>
        city.kind==='city' && candidate.parentCityId===city.id && (city.nameEn===candidate.nameEn ||
          (city.canonicalAreas.length===1 && city.canonicalAreas[0]===candidate.canonicalAreas[0]))));
      if (!candidates.length) continue;
      if (candidates.length > 1) throw new SearchResolutionError('AMBIGUOUS_SEARCH_LOCATION','Location alias is ambiguous',[{input:phrase.text,candidates}]);
      locations.push(candidates[0]!);
      for (let i=phrase.start;i<phrase.end;i++) used.add(i);
    }
    const cities = locations.filter(l => l.kind==='city'), areas = locations.filter(l => l.kind==='area');
    const cityAreas = cities.length ? [...new Set(cities.flatMap(l => l.canonicalAreas))] : null;
    const areaKeys = areas.length ? [...new Set(areas.flatMap(l => l.canonicalAreas))] : null;
    return {normalizedQuery,remainingQuery:tokens.filter((_,i) => !used.has(i)).join(' '),
      locations:[...new Map(locations.map(l => [l.id,l])).values()],canonicalAreas:intersect(cityAreas,areaKeys)};
  }

  async resolveBrowse(input: { q?: string; areas?: string[]; city?: string }): Promise<ResolvedSearchQuery> {
    const city = input.city ? await this.resolveCity(input.city) : null;
    const areas = input.areas?.length ? await this.resolveAreaFilters(input.areas,city?.id) : null;
    const query = await this.resolveQuery(input.q ?? '');
    return {...query,canonicalAreas:intersect(intersect(city?.canonicalAreas ?? null,areas?.canonicalAreas ?? null),query.canonicalAreas),
      locations:[...new Map([...(city ? [city] : []),...(areas?.locations ?? []),...query.locations].map(l => [l.id,l])).values()]};
  }
}
