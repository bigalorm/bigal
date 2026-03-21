import type { QueryResult } from '../types/index.js';

/**
 * Result of an update operation that returns records
 */
export interface UpdateResult<T extends Record<string, unknown>> extends PromiseLike<QueryResult<T>[]> {
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
