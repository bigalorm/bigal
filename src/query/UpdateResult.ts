import type { Entity } from '../Entity.js';
import type { PlainObject, QueryResult } from '../types/index.js';

/**
 * Result of an update operation that returns plain objects (after calling toJSON())
 */
export interface UpdateResultJSON<T extends Entity> extends PromiseLike<PlainObject<QueryResult<T>>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): UpdateResultJSON<T>;
}

/**
 * Result of an update operation that returns records
 */
export interface UpdateResult<T extends Entity> extends PromiseLike<QueryResult<T>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): UpdateResultJSON<T>;
}
