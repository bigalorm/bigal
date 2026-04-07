import type { ModelMetadata } from './metadata/index.js';
import type { CountArgs } from './query/CountArgs.js';
import type { CountResult, FindArgs, FindOneArgs, FindOneResult, FindResult, WhereQuery } from './query/index.js';
import type { SchemaDefinition } from './schema/InferTypes.js';
import type { TableDefinition } from './schema/TableDefinition.js';
import type { DefaultModelsMap, QueryResult } from './types/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance: models use contravariant hook params
type AnyModel = TableDefinition<string, any>;

export interface IReadonlyRepository<T extends Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition, TModels extends Record<string, AnyModel> = DefaultModelsMap> {
  /** @internal Phantom property for type-level schema extraction */
  readonly _schema?: TSchema;
  /** @internal Phantom property for type-level models map extraction */
  readonly _models?: TModels;
  readonly model: ModelMetadata<T>;

  /**
   * Gets a single object
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
   * @param {object} [args.pool] - Override the db pool to use for the query
   */
  findOne<K extends string & keyof T, TReturn = QueryResult<Pick<T, K | 'id'>, TSchema>>(args?: FindOneArgs<T, K> | WhereQuery<T>): FindOneResult<T, TReturn, never, TSchema, TModels>;

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
  find<K extends string & keyof T, TReturn = QueryResult<Pick<T, K | 'id'>, TSchema>>(args?: FindArgs<T, K> | WhereQuery<T>): FindResult<T, TReturn, never, TSchema, TModels>;

  /**
   * Gets a count of rows matching the where query
   * @param {object} [args] - Arguments
   * @param {object} [args.where] - Object representing the where query
   * @param {object} [args.pool] - Override the db pool to use for the query
   * @returns {number} Number of records matching the where criteria
   */
  count(args?: CountArgs<T> | WhereQuery<T>): CountResult<T>;
}
