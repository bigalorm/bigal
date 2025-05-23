import _ from 'lodash';

import type { Entity } from './Entity.js';
import type { IRepository } from './IRepository.js';
import type { CreateOptions } from './query/CreateOptions.js';
import type { CreateUpdateOptions, DeleteOptions, DestroyResult, DoNotReturnRecords, ReturnSelect, WhereQuery } from './query/index.js';
import type { OnConflictOptions } from './query/OnConflictOptions.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { getDeleteQueryAndParams, getInsertQueryAndParams, getUpdateQueryAndParams } from './SqlHelper.js';
import type { CreateUpdateParams, OmitEntityCollections, OmitFunctions, QueryResult } from './types/index.js';

export class Repository<T extends Entity> extends ReadonlyRepository<T> implements IRepository<T> {
  /**
   * Creates an object using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object}
   */
  public create(values: CreateUpdateParams<T>, options?: OnConflictOptions<T> | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): Promise<QueryResult<T>>;

  /**
   * Creates an object or objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {object} options
   * @param {boolean} options.returnRecords - Determines if inserted records should be returned
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {void}
   */
  public create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options: DoNotReturnRecords & Partial<OnConflictOptions<T>>): Promise<void>;

  /**
   * Creates objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]}
   */
  public create(values: CreateUpdateParams<T>[], options?: (OnConflictOptions<T> & Partial<ReturnSelect<T>>) | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): Promise<QueryResult<T>[]>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object|object[]|void} Return value from the db
   */
  public async create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options?: CreateOptions<T>): Promise<QueryResult<T> | QueryResult<T>[] | void> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isArray(values) && !values.length) {
      return [];
    }

    if (this._type.beforeCreate) {
      if (Array.isArray(values)) {
        // @ts-expect-error - Promise.void will not be hit, but is needed
        values = await Promise.all(values.map((value) => (this._type.beforeCreate ? this._type.beforeCreate(value) : Promise.resolve())));
      } else {
        values = await this._type.beforeCreate(values);
      }
    }

    let returnRecords = true;
    let returnSelect: (string & keyof OmitFunctions<OmitEntityCollections<T>>)[] | undefined;
    if (options) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/no-unnecessary-boolean-literal-compare
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      onConflict: options?.onConflict,
    });

    const results = await this._pool.query<Partial<QueryResult<T>>>(query, params);
    if (returnRecords) {
      if (_.isArray(values)) {
        return this._buildInstances(results.rows);
      }

      const firstResult = _.first(results.rows);
      if (firstResult) {
        return this._buildInstance(firstResult);
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
  public update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: ReturnSelect<T>): Promise<QueryResult<T>[]>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} Return values from the db or `true` if returnRecords=false
   */
  public async update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: CreateUpdateOptions<T>): Promise<QueryResult<T>[] | void> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isString(where)) {
      throw new Error('The query cannot be a string, it must be an object');
    }

    if (this._type.beforeUpdate) {
      values = await this._type.beforeUpdate(values);
    }

    let returnRecords = true;
    let returnSelect: (string & keyof OmitFunctions<OmitEntityCollections<T>>)[] | undefined;
    if (options) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/no-unnecessary-boolean-literal-compare
      if ((options as DoNotReturnRecords).returnRecords === false) {
        returnRecords = false;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

    const results = await this._pool.query<Partial<QueryResult<T>>>(query, params);

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
  public destroy(where: WhereQuery<T>, options: DeleteOptions<T>): DestroyResult<T, QueryResult<T>[]>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} `void` or records affected if returnRecords=true
   */
  public destroy(where: WhereQuery<T> = {}, options?: DeleteOptions<T>): DestroyResult<T, QueryResult<T>[] | void> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    const { stack } = new Error(`${this.model.name}.destroy()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;
    const returnSelect = options?.returnSelect;
    const returnRecords = options?.returnRecords ?? !!returnSelect;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       * @returns Query instance
       */
      where(value: WhereQuery<T>): DestroyResult<T, QueryResult<T>[] | void> {
        where = value;

        return this;
      },
      async then<TResult = QueryResult<T>[], TErrorResult = void>(
        resolve: (result: QueryResult<T>[] | void) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
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

          const result = await modelInstance._pool.query<Partial<QueryResult<T>>>(query, params);

          if (returnRecords) {
            return await resolve(modelInstance._buildInstances(result.rows));
          }

          return await resolve();
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack = `${typedException.stack}\n\n${stack}`;
          } else {
            typedException.stack = stack;
          }

          return reject(typedException);
        }
      },
    };
  }
}
