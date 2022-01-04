import type { Entity } from './Entity';
import type { ModelMetadata } from './metadata';
import type { CountResult, FindArgs, FindOneArgs, FindOneResult, FindResult, WhereQuery } from './query';
import type { QueryResult } from './types';

export interface IReadonlyRepository<T extends Entity> {
  readonly model: ModelMetadata<T>;

  /**
   * Gets a single object
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
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
   * @param {object} [where] - Object representing the where query
   * @returns {number} Number of records matching the where criteria
   */
  count(where?: WhereQuery<T>): CountResult<T>;
}
