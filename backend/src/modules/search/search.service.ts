import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { searchEntities, publicUnits, toSuggestion, type Entity } from './search-entities.js';
import { normalizeSearch } from './search-normalization.js';
import { searchRows, type SearchExecutor } from './search-db.js';
import type { SearchSuggestResult } from './search.schemas.js';

type SearchDatabase = SearchExecutor & { transaction<T>(fn: (tx: SearchExecutor) => Promise<T>): Promise<T> };
type CacheEntry = { revision: string; expiresAt: number; value: SearchSuggestResult };

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
        ${searchEntities(defaults ? 'defaults' : 'typed')}, matches AS (
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
    // Keep live inventory first; fill the two-row rails from the existing catalog.
    // Defaults have 6-10 cards per section; typed results retain the requested total limit.
    const sectionLimit=Math.min(10,Math.max(6,limit));
    const majorAreas=['hamra','achrafieh','gemmayzeh','mar-mikhael','verdun','badaro','jounieh','dekwaneh','byblos','zahle'];
    const areaRows=rows.filter(r=>r.type==='area'&&(r.popularity>0||majorAreas.includes(r.slug??'')));
    areaRows.sort((a,b)=>b.popularity-a.popularity || (a.popularity>0 ? a.labelEn.localeCompare(b.labelEn) : majorAreas.indexOf(a.slug??'')-majorAreas.indexOf(b.slug??'')) || a.labelEn.localeCompare(b.labelEn));
    const value:SearchSuggestResult={query:q,normalizedQuery:normalized,mode:defaults?'defaults':'results',minQueryLength:2,
      results:defaults ? [] : rows.map(toSuggestion),sections:{
        topAreas:defaults ? areaRows.slice(0,sectionLimit).map(toSuggestion) as SearchSuggestResult['sections']['topAreas'] : [],
        topCampuses:defaults ? rows.filter(r=>r.type==='campus').slice(0,sectionLimit).map(toSuggestion) as SearchSuggestResult['sections']['topCampuses'] : [],
      }};
    this.cache.delete(key);
    if(this.cache.size>=500) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,{revision:state!.revision,expiresAt:now+Math.min(60_000,Math.max(0,Number(state!.expiryMs ?? 60_000))),value});
    return structuredClone(value);
  }
}
export const searchService=new SearchService();
