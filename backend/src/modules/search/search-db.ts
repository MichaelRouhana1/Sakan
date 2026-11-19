import type { SQL } from 'drizzle-orm';

/** Accepts the app database or a transaction, without creating another connection. */
export type SearchExecutor = { execute(query: SQL): PromiseLike<unknown> };

export async function searchRows<T>(executor: SearchExecutor, query: SQL): Promise<T[]> {
  const result = await executor.execute(query);
  return Array.from(Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];
}
