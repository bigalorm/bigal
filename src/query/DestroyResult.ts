import type { Entity } from '../Entity.js';
import type { PlainObject } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

/**
 * Result of a destroy operation that returns plain objects (after calling toJSON())
 */
export interface DestroyResultJSON<TEntity extends Entity, TReturn> extends PromiseLike<PlainObject<TReturn>[]> {
  where(args: WhereQuery<TEntity>): DestroyResultJSON<TEntity, TReturn>;
}

/**
 * Result of a destroy operation that does not return records
 */
export interface DestroyResult<TEntity extends Entity, TReturn> extends PromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
}

/**
 * Result of a destroy operation that returns records (includes toJSON method)
 */
export interface DestroyResultWithRecords<TEntity extends Entity, TReturn> extends PromiseLike<TReturn[]> {
  where(args: WhereQuery<TEntity>): DestroyResultWithRecords<TEntity, TReturn>;
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): DestroyResultJSON<TEntity, TReturn>;
}
