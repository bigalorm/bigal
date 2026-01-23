import type { Entity } from '../Entity.js';
import type { PlainObject, QueryResult } from '../types/index.js';

/**
 * Result of a create operation that returns a plain object (after calling toJSON())
 */
export interface CreateResultJSON<T extends Entity> extends PromiseLike<PlainObject<QueryResult<T>>> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): CreateResultJSON<T>;
}

/**
 * Result of a create operation that returns multiple plain objects (after calling toJSON())
 */
export interface CreateResultArrayJSON<T extends Entity> extends PromiseLike<PlainObject<QueryResult<T>>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): CreateResultArrayJSON<T>;
}

/**
 * Result of a create operation that returns a single record
 */
export interface CreateResult<T extends Entity> extends PromiseLike<QueryResult<T>> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): CreateResultJSON<T>;
}

/**
 * Result of a create operation that returns multiple records
 */
export interface CreateResultArray<T extends Entity> extends PromiseLike<QueryResult<T>[]> {
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): CreateResultArrayJSON<T>;
}
