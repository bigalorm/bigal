import _ from 'lodash';

import type { Entity } from './Entity';
import type { IRepository } from './IRepository';
import type {
  CreateUpdateOptions, //
  DestroyResult,
  DoNotReturnRecords,
  ReturnSelect,
  WhereQuery,
  DeleteOptions,
} from './query';
import { ReadonlyRepository } from './ReadonlyRepository';
import { getDeleteQueryAndParams, getInsertQueryAndParams, getUpdateQueryAndParams } from './SqlHelper';
import type { CreateUpdateParams, OmitFunctionsAndEntityCollections, QueryResponse } from './types';

export class Repository<T extends Entity> extends ReadonlyRepository<T> implements IRepository<T> {
  /**
   * Creates a objects using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object}
   */
  public create(values: CreateUpdateParams<T>, options?: ReturnSelect<T>): Promise<QueryResponse<T>>;

  /**
   * Creates a objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @returns {void}
   */
  public create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options: DoNotReturnRecords): Promise<void>;

  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  public create(values: CreateUpdateParams<T>[], options?: ReturnSelect<T>): Promise<QueryResponse<T>[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object|object[]|void} Return value from the db
   */
  public async create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options?: CreateUpdateOptions<T>): Promise<QueryResponse<T> | QueryResponse<T>[] | void> {
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
    let returnSelect: (string & keyof OmitFunctionsAndEntityCollections<T>)[] | undefined;
    if (options) {
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
      } else if ((options as ReturnSelect<T>).returnSelect) {
        returnSelect = (options as ReturnSelect<T>).returnSelect;
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

    return undefined;
  }

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @returns {void}
   */
  public update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options: DoNotReturnRecords): Promise<void>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options] - Values to update
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  public update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: ReturnSelect<T>): Promise<QueryResponse<T>[]>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} Return values from the db or `true` if returnRecords=false
   */
  public async update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: CreateUpdateOptions<T>): Promise<QueryResponse<T>[] | void> {
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
    let returnSelect: (string & keyof OmitFunctionsAndEntityCollections<T>)[] | undefined;
    if (options) {
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
      } else if ((options as ReturnSelect<T>).returnSelect) {
        returnSelect = (options as ReturnSelect<T>).returnSelect;
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

    return undefined;
  }

  /**
   * Destroys object(s) matching the where query
   * @param {object} [where] - Object representing the where query
   * @returns {void}
   */
  public destroy(where?: WhereQuery<T>): DestroyResult<T, void>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} options - Determines if inserted records should be returned
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  public destroy(where: WhereQuery<T>, options: DeleteOptions<T>): DestroyResult<T, QueryResponse<T>[]>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords=false] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} `void` or records affected if returnRecords=true
   */
  public destroy(where: WhereQuery<T> = {}, options?: DeleteOptions<T>): DestroyResult<T, QueryResponse<T>[] | void> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    const { stack } = new Error(`${this.model.name}.destroy()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;
    const returnSelect = options?.returnSelect;
    const returnRecords = options?.returnRecords || !!returnSelect;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery<T>): DestroyResult<T, QueryResponse<T>[] | void> {
        // eslint-disable-next-line no-param-reassign
        where = value;

        return this;
      },
      async then(resolve: (result: QueryResponse<T>[] | void) => QueryResponse<T>[] | void, reject: (err: Error) => void): Promise<QueryResponse<T>[] | void> {
        if (_.isString(where)) {
          return reject(new Error('The query cannot be a string, it must be an object'));
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

          return resolve();
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += stack;
          } else {
            typedException.stack = stack;
          }

          return reject(typedException);
        }
      },
    };
  }
}
