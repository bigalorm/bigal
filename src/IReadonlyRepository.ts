import type { Entity } from './Entity.js';
import type { ModelMetadata } from './metadata/index.js';
import type { CountArgs } from './query/CountArgs.js';
import type { CountResult, FindArgs, FindOneArgs, FindOneResult, FindResult, WhereQuery } from './query/index.js';
import type { QueryResult } from './types/index.js';

export interface IReadonlyRepository<T extends Entity> {
  readonly model: ModelMetadata<T>;

  /**
   * Gets a single object
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
   * @param {object} [args.pool] - Override the db pool to use for the query
   */
  findOne<
    // Optional keys specified as args.select
    K extends string & keyof T,
    // Return type used to pass through to all chained methods
    TReturn = QueryResult<Pick<T, K | 'id'>>,
  >(
    args: FindOneArgs<T, K> | WhereQuery<T>,
  ): FindOneResult<T, TReturn>;

  /**
   * Gets a collection of objects
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
   * @param {string|number} [args.skip] - Number of records to skip
   * @param {string|number} [args.limit] - Number of results to return
   * @param {object} [args.pool] - Override the db pool to use for the query
   */
  find<
    // Optional keys specified as args.select
    K extends string & keyof T,
    // Return type used to pass through to all chained methods
    TReturn = QueryResult<Pick<T, K | 'id'>>,
  >(
    args: FindArgs<T, K> | WhereQuery<T>,
  ): FindResult<T, TReturn>;

  /**
   * Gets a count of rows matching the where query
   * @param {object} [args] - Arguments
   * @param {object} [args.where] - Object representing the where query
   * @param {object} [args.pool] - Override the db pool to use for the query
   * @returns {number} Number of records matching the where criteria
   */
  count(args?: CountArgs<T> | WhereQuery<T>): CountResult<T>;
}
