import _ from 'lodash';
import { ReadonlyRepository } from './ReadonlyRepository';
import { Entity } from './Entity';
import { CreateUpdateDeleteOptions, DestroyResult, DoNotReturnRecords, WhereQuery } from './query';
import { SqlHelper } from './SqlHelper';

export class Repository<T extends Entity> extends ReadonlyRepository<T> {
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
  public async create(values: Partial<T> | Array<Partial<T>>, options: DoNotReturnRecords): Promise<boolean>;
  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async create(values: Array<Partial<T>>, options?: CreateUpdateDeleteOptions): Promise<T[]>;
  /**
   * Creates an object using the specified values
   * @param {Object|Object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {Object} Return value from the db
   */
  public async create(values: Partial<T> | Array<Partial<T>>, {
    returnRecords = true,
    returnSelect,
  }: CreateUpdateDeleteOptions = {
    returnRecords: true,
  }): Promise<T | T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isArray(values) && !values.length) {
      return [];
    }

    if (this._type.beforeCreate) {
      if (Array.isArray(values)) {
        // tslint:disable-next-line:no-parameter-reassignment
        values = await Promise.all(values.map(this._type.beforeCreate)) as Array<Partial<T>>;
      } else {
        // tslint:disable-next-line:no-parameter-reassignment
        values = await this._type.beforeCreate(values) as Partial<T>;
      }
    }

    const {
      query,
      params,
    } = SqlHelper.getInsertQueryAndParams({
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

      throw new Error(('Unknown error getting created rows back from the database'));
    }

    return true;
  }

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<T>, options: DoNotReturnRecords): Promise<boolean>;
  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {Object} [options] - Values to update
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[]>;
  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {Object[]} Return values from the db or `true` if returnRecords=false
   */
  public async update(where: WhereQuery, values: Partial<T>, {
    returnRecords = true,
    returnSelect,
  }: CreateUpdateDeleteOptions = {
    returnRecords: true,
  }): Promise<T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (_.isString(where)) {
      throw new Error('The query cannot be a string, it must be an object');
    }

    if (this._type.beforeUpdate) {
      // tslint:disable-next-line:no-parameter-reassignment
      values = await this._type.beforeUpdate(values) as Partial<T>;
    }

    const {
      query,
      params,
    } = SqlHelper.getUpdateQueryAndParams({
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
   * @param {Object} where - Object representing the where query
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public destroy(where: WhereQuery, options: DoNotReturnRecords): DestroyResult<T, boolean>;
  /**
   * Destroys object(s) matching the where query
   * @param {Object} where - Object representing the where query
   * @param {Object} [options] - Determines if inserted records should be returned
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @returns {boolean}
   */
  public destroy(where?: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[]>;
  /**
   * Destroys object(s) matching the where query
   * @param {Object} where - Object representing the where query
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {Object[]|Boolean} Records affected or `true` if returnRecords=false
   */
  public destroy(where: WhereQuery = {}, {
    returnRecords = true,
    returnSelect,
  }: CreateUpdateDeleteOptions = {
    returnRecords: true,
  }): DestroyResult<T, T[] | boolean> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    const {
      stack,
    } = new Error(`${this.model.name}.destroy()`);

    // tslint:disable-next-line:no-this-assignment
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {Object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        // tslint:disable-next-line:no-parameter-reassignment
        where = value;

        return this;
      },
      async then(resolve: (result: T[] | boolean) => void, reject: (err: Error) => void) {
        if (_.isString(where)) {
          reject(new Error('The query cannot be a string, it must be an object'));
        }

        try {
          const {
            query,
            params,
          } = SqlHelper.getDeleteQueryAndParams({
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
          ex.stack += stack;
          reject(ex);
        }
      },
    };
  }
}
