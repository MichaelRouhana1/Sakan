import { sql } from 'drizzle-orm';
import { searchRows, type SearchExecutor } from './search-db.js';

/** PostgreSQL is authoritative: the alias trigger and query resolver call this same function. */
export async function normalizeSearch(executor: SearchExecutor, value: string): Promise<string> {
  const [row] = await searchRows<{ normalized: string }>(executor, sql`SELECT search_normalize(${value}) AS normalized`);
  return row!.normalized;
}

export function searchPhrases(normalized: string) {
  const tokens = normalized.split(' ').filter(Boolean);
  const phrases: { text: string; start: number; end: number }[] = [];
  for (let start = 0; start < tokens.length; start++) {
    for (let end = tokens.length; end > start; end--) {
      const text = tokens.slice(start, end).join(' ');
      if ([...text].length >= 2) phrases.push({ text, start, end });
    }
  }
  return phrases.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
}
