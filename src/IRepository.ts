import type { Entity } from './Entity.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { CreateOptions } from './query/CreateOptions.js';
import type { CreateUpdateOptions, DeleteOptions, DestroyResult, DoNotReturnRecords, ReturnSelect, WhereQuery } from './query/index.js';
import type { OnConflictOptions } from './query/OnConflictOptions.js';
import type { CreateUpdateParams, QueryResult } from './types/index.js';

export interface IRepository<T extends Entity> extends IReadonlyRepository<T> {
  /**
   * Creates an object using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object}
   */
  create(values: CreateUpdateParams<T>, options?: OnConflictOptions<T> | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): Promise<QueryResult<T>>;

  /**
   * Creates an object or objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {void}
   */
  create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options: DoNotReturnRecords & Partial<OnConflictOptions<T>>): Promise<void>;

  /**
   * Creates objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  create(values: CreateUpdateParams<T>[], options?: (OnConflictOptions<T> & Partial<ReturnSelect<T>>) | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): Promise<QueryResult<T>[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object|object[]|void} Return value from the db
   */
  create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options?: CreateOptions<T>): Promise<QueryResult<T>[]> | Promise<QueryResult<T>> | Promise<void>;

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
  update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: CreateUpdateOptions<T>): Promise<QueryResult<T>[]> | Promise<void>;

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
  destroy<TOptions extends DeleteOptions<T> = DeleteOptions<T>>(where: WhereQuery<T>, options?: TOptions): TOptions extends DeleteOptions<T> ? Promise<void> : DestroyResult<T, QueryResult<T>[]>;
}
