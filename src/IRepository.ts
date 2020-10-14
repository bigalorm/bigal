import type { Entity } from './Entity';
import type { IReadonlyRepository } from './IReadonlyRepository';
import type {
  CreateUpdateDeleteOptions, //
  DestroyResult,
  DoNotReturnRecords,
  WhereQuery,
} from './query';

export interface IRepository<T extends Entity> extends IReadonlyRepository<T> {
  /**
   * Creates a objects using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  create(values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T>;

  /**
   * Creates a objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  create(values: Partial<T> | Partial<T>[], options: DoNotReturnRecords): Promise<boolean>;

  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  create(values: Partial<T>[], options?: CreateUpdateDeleteOptions): Promise<T[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object} Return value from the db
   */
  create(values: Partial<T> | Partial<T>[], options?: CreateUpdateDeleteOptions): Promise<T | T[] | boolean>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  update(where: WhereQuery, values: Partial<T>, options: DoNotReturnRecords): Promise<boolean>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options] - Values to update
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[]>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]} Return values from the db or `true` if returnRecords=false
   */
  update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[] | boolean>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  destroy(where: WhereQuery, options: DoNotReturnRecords): DestroyResult<T, boolean>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options] - Determines if inserted records should be returned
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @returns {boolean}
   */
  destroy(where?: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[]>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|boolean} Records affected or `true` if returnRecords=false
   */
  destroy(where: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[] | boolean>;
}
