import { sql } from 'drizzle-orm';
import type { SearchExecutor } from '../../modules/search/search-db.js';

/** Bundled area photographs; provenance and reuse licenses accompany the assets. */
export const searchLocationImageSlugs = ['hamra','gemmayzeh','verdun','achrafieh','mar-mikhael','badaro','jounieh','dekwaneh','byblos','zahle'] as const;
export async function seedSearchLocationImages(executor: SearchExecutor) {
  for (const slug of searchLocationImageSlugs) {
    const imageUrl=`/assets/search/areas/${slug}.jpg`;
    // The matching small-town city uses the same photo. Preserve manual curation.
    await executor.execute(sql`UPDATE search_locations SET image_url=${imageUrl}
      WHERE slug=${slug} AND image_url IS NULL`);
  }
}
