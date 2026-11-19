import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { NotFoundError } from '../../lib/errors.js';
import { searchRows, type SearchExecutor } from './search-db.js';
import { searchEntities, toSuggestion, type Entity } from './search-entities.js';
import type { SearchRecentInput, SearchSuggestion } from './search.schemas.js';
type SearchDatabase = SearchExecutor & { transaction<T>(fn: (tx: SearchExecutor) => Promise<T>): Promise<T> };
const targetKey = (item: SearchRecentInput) => item.type==='city'||item.type==='area' ? item.id : `${item.type}:${item.id}`;

export class SearchRecentsService {
  constructor(private readonly database: SearchDatabase = db) {}
  private async listWith(executor: SearchExecutor,userId: string): Promise<SearchSuggestion[]> {
    const rows=await searchRows<Entity>(executor,sql`${searchEntities('all')}
      SELECT e.* FROM user_search_recents r JOIN entities e ON e."targetKey"=
        CASE WHEN r.entity_type IN ('city','area') THEN r.entity_id ELSE r.entity_type || ':' || r.entity_id END
        AND e.type=r.entity_type
      WHERE r.user_id=${userId}::uuid ORDER BY r.last_selected_at DESC,r.entity_type,r.entity_id LIMIT 8`);
    return rows.map(toSuggestion);
  }
  async list(userId: string) {return this.listWith(this.database,userId);}
  async remember(userId: string,item: SearchRecentInput) {
    return this.database.transaction(async tx=>{
      // Serialize an account's writes so concurrent selections cannot exceed eight.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId},0))`);
      const [entity]=await searchRows<Entity>(tx,sql`${searchEntities('all')}
        SELECT * FROM entities WHERE "targetKey"=${targetKey(item)} AND type=${item.type}`);
      if (!entity) throw new NotFoundError('This search location is no longer available');
      await tx.execute(sql`INSERT INTO user_search_recents(user_id,entity_type,entity_id,last_selected_at)
        VALUES (${userId}::uuid,${item.type},${item.id},clock_timestamp())
        ON CONFLICT(user_id,entity_type,entity_id) DO UPDATE SET last_selected_at=excluded.last_selected_at`);
      await tx.execute(sql`DELETE FROM user_search_recents WHERE user_id=${userId}::uuid AND (entity_type,entity_id) NOT IN (
        SELECT entity_type,entity_id FROM user_search_recents WHERE user_id=${userId}::uuid
        ORDER BY last_selected_at DESC,entity_type,entity_id LIMIT 8)`);
      return this.listWith(tx,userId);
    });
  }
  async clear(userId: string) {
    await this.database.transaction(async tx=>{
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId},0))`);
      await tx.execute(sql`DELETE FROM user_search_recents WHERE user_id=${userId}::uuid`);
    });
  }
}
export const searchRecentsService=new SearchRecentsService();
