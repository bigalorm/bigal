import type { QueryResult } from '../types/index.js';

/**
 * Result of a create operation that returns a single record
 */
export interface CreateResult<T extends Record<string, unknown>> extends PromiseLike<QueryResult<T>> {
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}

/**
 * Result of a create operation that returns multiple records
 */
export interface CreateResultArray<T extends Record<string, unknown>> extends PromiseLike<QueryResult<T>[]> {
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
