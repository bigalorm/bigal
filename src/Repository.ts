import _ from 'lodash';

import type { Entity } from './Entity';
import type { IRepository } from './IRepository';
import type {
  CreateUpdateDeleteOptions, //
  DestroyResult,
  DoNotReturnRecords,
  ReturnSelect,
  WhereQuery,
} from './query';
import type { ReadonlyRepository } from './ReadonlyRepository';
import { getDeleteQueryAndParams, getInsertQueryAndParams, getUpdateQueryAndParams } from './SqlHelper';

export class Repository<T extends Entity> extends ReadonlyRepository<T> implements IRepository<T> {
  /**
   * Creates a objects using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async create(values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T>;

  /**
   * Creates a objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async create(values: Partial<T> | Partial<T>[], options: DoNotReturnRecords): Promise<boolean>;

  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async create(values: Partial<T>[], options?: CreateUpdateDeleteOptions): Promise<T[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object} Return value from the db
   */
  public async create(values: Partial<T> | Partial<T>[], options?: CreateUpdateDeleteOptions): Promise<T | T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isArray(values) && !values.length) {
      return [];
    }

    if (this._type.beforeCreate) {
      if (Array.isArray(values)) {
        // eslint-disable-next-line no-param-reassign
        values = await Promise.all(values.map(this._type.beforeCreate));
      } else {
        // eslint-disable-next-line no-param-reassign
        values = await this._type.beforeCreate(values);
      }
    }

    let returnRecords = true;
    let returnSelect: string[] | undefined;
    if (options) {
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
      } else if ((options as ReturnSelect).returnSelect) {
        returnSelect = (options as ReturnSelect).returnSelect;
      }
    }

    const { query, params } = getInsertQueryAndParams({
      repositoriesByModelNameLowered: this._repositoriesByModelNameLowered,
      model: this.model,
      values,
      returnRecords,
      returnSelect,
    });

    const results = await this._pool.query(query, params);
    if (returnRecords) {
      if (_.isArray(values)) {
        return this._buildInstances(results.rows);
      }

      if (results.rows && results.rows.length) {
        return this._buildInstance(results.rows[0]);
      }

      throw new Error('Unknown error getting created rows back from the database');
    }

    return true;
  }

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<T>, options: DoNotReturnRecords): Promise<boolean>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options] - Values to update
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[]>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]} Return values from the db or `true` if returnRecords=false
   */
  public async update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isString(where)) {
      throw new Error('The query cannot be a string, it must be an object');
    }

    if (this._type.beforeUpdate) {
      // eslint-disable-next-line no-param-reassign
      values = await this._type.beforeUpdate(values);
    }

    let returnRecords = true;
    let returnSelect: string[] | undefined;
    if (options) {
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
      } else if ((options as ReturnSelect).returnSelect) {
        returnSelect = (options as ReturnSelect).returnSelect;
      }
    }

    const { query, params } = getUpdateQueryAndParams({
      repositoriesByModelNameLowered: this._repositoriesByModelNameLowered,
      model: this.model,
      where,
      values,
      returnRecords,
      returnSelect,
    });

    const results = await this._pool.query(query, params);

    if (returnRecords) {
      return this._buildInstances(results.rows);
    }

    return true;
  }

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public destroy(where: WhereQuery, options: DoNotReturnRecords): DestroyResult<T, boolean>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options] - Determines if inserted records should be returned
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @returns {boolean}
   */
  public destroy(where?: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[]>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|boolean} Records affected or `true` if returnRecords=false
   */
  public destroy(where: WhereQuery = {}, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    const { stack } = new Error(`${this.model.name}.destroy()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    let returnRecords = true;
    let returnSelect: string[] | undefined;
    if (options) {
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
      } else if ((options as ReturnSelect).returnSelect) {
        returnSelect = (options as ReturnSelect).returnSelect;
      }
    }

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery): DestroyResult<T, T[] | boolean> {
        // eslint-disable-next-line no-param-reassign
        where = value;

        return this;
      },
      async then(resolve: (result: T[] | boolean) => T[] | boolean, reject: (err: Error) => void): Promise<T[] | boolean> {
        if (_.isString(where)) {
          reject(new Error('The query cannot be a string, it must be an object'));
          return false;
        }

        try {
          const { query, params } = getDeleteQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            where,
            returnRecords,
            returnSelect,
          });

          const result = await modelInstance._pool.query(query, params);

          if (returnRecords) {
            return resolve(modelInstance._buildInstances(result.rows));
          }

          return resolve(true);
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += stack;
          } else {
            typedException.stack = stack;
          }

          reject(typedException);
          return false;
        }
      },
    };
  }
}
