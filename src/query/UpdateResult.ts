import type { PlainObject, QueryResult } from '../types/index.js';

/**
 * Result of an update operation that returns plain objects (after calling toJSON())
 */
export interface UpdateResultJSON<T extends Record<string, unknown>> extends PromiseLike<PlainObject<QueryResult<T>>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): UpdateResultJSON<T>;
}

/**
 * Result of an update operation that returns records
 */
export interface UpdateResult<T extends Record<string, unknown>> extends PromiseLike<QueryResult<T>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): UpdateResultJSON<T>;
}
