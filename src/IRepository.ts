import type { Entity } from './Entity';
import type { IReadonlyRepository } from './IReadonlyRepository';
import type {
  CreateUpdateOptions, //
  DeleteOptions,
  DestroyResult,
  DoNotReturnRecords,
  ReturnSelect,
  WhereQuery,
} from './query';
import type { CreateUpdateParams, QueryResult } from './types';

export interface IRepository<T extends Entity> extends IReadonlyRepository<T> {
  /**
   * Creates a objects using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object}
   */
  create(values: CreateUpdateParams<T>, options?: ReturnSelect<T>): Promise<QueryResult<T>>;

  /**
   * Creates a objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @returns {void}
   */
  create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options: DoNotReturnRecords): Promise<void>;

  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  create(values: CreateUpdateParams<T>[], options?: ReturnSelect<T>): Promise<QueryResult<T>[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object|object[]|void} Return value from the db
   */
  create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options?: CreateUpdateOptions<T>): Promise<QueryResult<T> | QueryResult<T>[] | void>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @param {{returnRecords: false}} options
   * @returns {void}
   */
  update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options: DoNotReturnRecords): Promise<void>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options] - Values to update
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: ReturnSelect<T>): Promise<QueryResult<T>[]>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} Return values from the db or `true` if returnRecords=false
   */
  update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: CreateUpdateOptions<T>): Promise<QueryResult<T>[] | void>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} [where] - Object representing the where query
   * @returns {void}
   */
  destroy(where?: WhereQuery<T>): DestroyResult<T, void>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} options - Determines if inserted records should be returned
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  destroy(where: WhereQuery<T>, options: DeleteOptions<T>): DestroyResult<T, QueryResult<T>[]>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=false] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} `void` or records affected if returnRecords=true
   */
  destroy<TOptions extends DeleteOptions<T> = DeleteOptions<T>>(where: WhereQuery<T>, options?: TOptions): DestroyResult<T, TOptions extends DeleteOptions<T> ? void : QueryResult<T>[]>;
}
