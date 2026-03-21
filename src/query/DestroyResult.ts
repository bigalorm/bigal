import type { QueryResult } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

/**
 * Result of a destroy operation that does not return records
 */
export interface DestroyResult<TEntity extends Record<string, unknown>, TReturn> extends PromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}

/**
 * Result of a destroy operation that returns records
 */
export interface DestroyResultWithRecords<TEntity extends Record<string, unknown>> extends PromiseLike<QueryResult<TEntity>[]> {
  where(args: WhereQuery<TEntity>): DestroyResultWithRecords<TEntity>;
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
