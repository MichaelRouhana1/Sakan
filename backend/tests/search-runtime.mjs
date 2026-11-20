import { seedSearchLocationImages } from '../dist/db/seeds/search-location-images.js';
import { readFile } from 'node:fs/promises';
import { drizzle } from 'drizzle-orm/postgres-js';
import { seedSearchCatalog } from '../dist/db/seeds/seed-search-catalog.js';

/** Add the search migrations and canonical catalog to disposable runtime fixtures. */
export async function exposeSearchRuntime(client) {
  for (const tag of ['0041_search_catalog','0042_search_suggest_cache','0043_search_location_images']) {
    const body = await readFile(new URL('../drizzle/'+tag+'.sql',import.meta.url),'utf8');
    for (const statement of body.split('--> statement-breakpoint')) await client.unsafe(statement);
  }
  await drizzle(client).transaction(async tx=>{await seedSearchCatalog(tx);await seedSearchLocationImages(tx);});
}
