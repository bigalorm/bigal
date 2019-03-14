import * as _ from 'lodash';
import { Pool } from 'postgres-pool';
import { SqlHelper } from './sqlHelper';
import { ModelSchema } from './schema/ModelSchema';
import { Repository } from './repository';
import { FindArgs } from './query/FindArgs';
import { FindOneArgs } from './query/FindOneArgs';
import { Attributes, CollectionAttribute, ModelAttribute, TypeAttribute } from './schema/attributes';
import { PopulateArgs } from './query/PopulateArgs';
import { CreateUpdateDeleteOptions, DoNotReturnRecords } from './query/CreateUpdateDeleteOptions';
import { CountResult } from './query/CountResult';
import { FindResult } from './query/FindResult';
import { FindOneResult } from './query/FindOneResult';
import { PaginateOptions } from './query/PaginateOptions';
import { WhereQuery } from './query/WhereQuery';
import { DestroyResult } from './query/DestroyResult';
import { ModelClassesByGlobalId } from './ModelClassesByGlobalId';
import { ModelSchemasByGlobalId } from './schema/ModelSchemasByGlobalId';
import { Entity } from './Entity';

interface ModelOptions {
  modelSchema: ModelSchema;
  modelSchemasByGlobalId: ModelSchemasByGlobalId;
  modelClassesByGlobalId: ModelClassesByGlobalId;
  pool: Pool;
  readonlyPool?: Pool;
}

export class Model<TEntity extends Entity> implements Repository<TEntity> {

  /**
   * Easy access to schema attributes
   * @returns {Object}
   */
  get attributes(): Attributes {
    return this._schema.attributes;
  }

  private _schema: ModelSchema;
  private _modelSchemasByGlobalId: ModelSchemasByGlobalId;
  private _modelClassesByGlobalId: ModelClassesByGlobalId;
  private _pool: Pool;
  private _readonlyPool: Pool;
  private _floatProperties: string[];
  private _intProperties: string[];
  private _hasInstanceFunctions: boolean;
  private _instance: Partial<TEntity>;

  /**
   * Creates a new Model object
   * @param {Object} modelSchema - Model definition
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} modelClassesByGlobalId - All model classes organized by global id
   * @param {Object} pool - Postgres Pool
   * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
   */
  constructor({
    modelSchema,
    modelSchemasByGlobalId,
    modelClassesByGlobalId,
    pool,
    readonlyPool,
  }: ModelOptions) {
    this._modelSchemasByGlobalId = modelSchemasByGlobalId;
    this._modelClassesByGlobalId = modelClassesByGlobalId;
    this._schema = modelSchema;
    this._pool = pool;
    this._readonlyPool = readonlyPool || pool;
    this._floatProperties = [];
    this._intProperties = [];
    this._hasInstanceFunctions = false;
    // Base object used for all instances. Contains instance functions defined as schema attribute functions
    this._instance = {};

    for (const [name, value] of Object.entries(this._schema.attributes)) {
      if (_.isFunction(value)) {
        this._hasInstanceFunctions = true;
        this._instance[name] = value;
      } else if ((value as TypeAttribute).type === 'float') {
        this._floatProperties.push(name);
      } else if ((value as TypeAttribute).type === 'integer') {
        this._intProperties.push(name);
      }
    }
  }

  /**
   * Gets a single object
   * @param {Object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {Object} [args.where] - Object representing the where query
   * @param {string|Object|string[]|Object[]} [args.sort] - Property name(s) to sort by
   */
  public findOne(args: FindOneArgs | WhereQuery = {}): FindOneResult<TEntity> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.findOne()`);
    let select: string[] = [];
    let where = {};
    let sort: string | string[] | null = null;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;
      switch (name) {
        case 'select':
          select = value;
          break;
        case 'where':
          where = value;
          break;
        case 'sort':
          sort = value;
          break;
        default:
          select = [];
          where = args;
          sort = null;
          isWhereCriteria = true;
          break;
      }

      if (isWhereCriteria) {
        break;
      }
    }

    interface Populate extends PopulateArgs {
      propertyName: string;
    }

    const populates: Populate[] = [];
    const sorts: Array<string | object> = [];
    if (_.isArray(sort)) {
      sorts.push(...sort);
    } else if (sort) {
      sorts.push(sort);
    }

    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {Object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        where = value;

        return this;
      },
      /**
       * Populates/hydrates relations
       * @param {string} propertyName - Name of property to join
       * @param {Object} [where] - Object representing the where query
       * @param {string[]} [select] - Array of model property names to return from the query.
       * @param {string|Object} [sort] - Property name(s) to sort by
       * @param {string|Number} [skip] - Number of records to skip
       * @param {string|Number} [limit] - Number of results to return
       */
      populate(propertyName: Extract<keyof TEntity, string>, {
        where: populateWhere,
        select: populateSelect,
        sort: populateSort,
        skip: populateSkip,
        limit: populateLimit,
      }: PopulateArgs = {}) {
        populates.push({
          propertyName,
          where: populateWhere,
          select: populateSelect,
          sort: populateSort,
          skip: populateSkip,
          limit: populateLimit,
        });

        return this;
      },
      /**
       * Sorts the query
       * @param {string|Object} value
       */
      sort(value: string | object) {
        sorts.push(value);

        return this;
      },
      async then(resolve: (result: TEntity | null) => void, reject: (err: Error) => void) {
        try {
          if (_.isString(where)) {
            throw new Error('The query cannot be a string, it must be an object');
          }

          const {
            query,
            params,
          } = SqlHelper.getSelectQueryAndParams({
            modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
            schema: modelInstance._schema,
            select,
            where,
            sorts,
            limit: 1,
            skip: 0,
          });

          const results = await modelInstance._readonlyPool.query(query, params);
          if (results.rows.length) {
            const result = modelInstance._buildInstance(results.rows[0]);

            const populateQueries = [];
            for (const populate of populates) {
              const property = modelInstance._schema.attributes[populate.propertyName];
              if (!property) {
                throw new Error(`Unable to find ${populate.propertyName} on ${modelInstance._schema.globalId} model for populating.`);
              }

              if ((property as ModelAttribute).model) {
                const populateModel = modelInstance._modelClassesByGlobalId[(property as ModelAttribute).model.toLowerCase()];
                if (!populateModel) {
                  throw new Error(`Unable to find model by global id: ${(property as ModelAttribute).model}`);
                }

                const primaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  schema: populateModel._schema,
                });

                const populateWhere = _.merge({
                  [primaryKeyName]: result[populate.propertyName],
                }, populate.where);

                populateQueries.push(async function populateSingle() {
                  result[populate.propertyName] = await populateModel.findOne({
                    select: populate.select,
                    where: populateWhere,
                    sort: populate.sort,
                  });
                }());
              } else if ((property as CollectionAttribute).collection) {
                const collectionProperty = property as CollectionAttribute;
                const populateModel = modelInstance._modelClassesByGlobalId[collectionProperty.collection.toLowerCase()];
                if (!populateModel) {
                  throw new Error(`Unable to find model for collection by global id ${collectionProperty.collection}. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                }

                const populateModelPrimaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  schema: populateModel._schema,
                });

                const primaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  schema: modelInstance._schema,
                });

                const id = result[primaryKeyName];
                if (_.isUndefined(id)) {
                  throw new Error(`Primary key (${primaryKeyName}) has no value for model ${modelInstance._schema.globalId}.`);
                }

                if (collectionProperty.through) {
                  const throughModel = modelInstance._modelClassesByGlobalId[collectionProperty.through.toLowerCase()];
                  if (!throughModel) {
                    throw new Error(`Unable to find model for multi-map collection by global id ${collectionProperty.through}. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                  }

                  // TODO: After all models are setup so it's a one time instead of during each query
                  let relatedModelProperty: CollectionAttribute | null = null;
                  for (const value of _.values(populateModel._schema.attributes)) {
                    const through = (value as CollectionAttribute).through;
                    if (through && through.toLowerCase() === (throughModel._schema.globalId || throughModel._schema.tableName || '__unknown__').toLowerCase()) {
                      relatedModelProperty = value as CollectionAttribute;
                      break;
                    }
                  }

                  if (!relatedModelProperty) {
                    throw new Error(`Unable to find property on related model for multi-map collection. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                  }

                  populateQueries.push(async function populateMultiMapCollection() {
                    const mapRecords = await throughModel.find({
                      select: [relatedModelProperty.via],
                      where: {
                        [collectionProperty.via]: id,
                      },
                    });
                    const ids = _.map(mapRecords, relatedModelProperty.via);

                    const populateWhere = _.merge({
                      [populateModelPrimaryKeyName]: ids,
                    }, populate.where);

                    result[populate.propertyName] = await populateModel.find({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                      skip: populate.skip,
                      limit: populate.limit,
                    });
                  }());
                } else {
                  const populateWhere = _.merge({
                    [collectionProperty.via]: id,
                  }, populate.where);

                  populateQueries.push(async function populateCollection() {
                    result[populate.propertyName] = await populateModel.find({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                      skip: populate.skip,
                      limit: populate.limit,
                    });
                  }());
                }
              }
            }

            if (populateQueries.length) {
              await Promise.all(populateQueries);
            }

            return resolve(result);
          }

          return resolve(null);
        } catch (ex) {
          ex.stack += stack;
          reject(ex);
        }
      },
    };
  }

  /**
   * Gets a collection of objects
   * @param {Object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {Object} [args.where] - Object representing the where query
   * @param {string|Object|string[]|Object[]} [args.sort] - Property name(s) to sort by
   * @param {string|Number} [args.skip] - Number of records to skip
   * @param {string|Number} [args.limit] - Number of results to return
   */
  public find(args: FindArgs | WhereQuery = {}): FindResult<TEntity> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.find()`);
    let select: string[] | undefined;
    let where = {};
    let sort: string | string[] | null = null;
    let skip: number | null = null;
    let limit: number | null = null;
    // Args can be a FindArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;
      switch (name) {
        case 'select':
          select = value;
          break;
        case 'where':
          where = value;
          break;
        case 'sort':
          sort = value;
          break;
        case 'skip':
          skip = value;
          break;
        case 'limit':
          limit = value;
          break;
        default:
          select = undefined;
          where = args;
          sort = null;
          skip = null;
          limit = null;
          isWhereCriteria = true;
          break;
      }

      if (isWhereCriteria) {
        break;
      }
    }

    const sorts: Array<string | object> = [];
    if (_.isArray(sort)) {
      sorts.push(...sort);
    } else if (sort) {
      sorts.push(sort);
    }

    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {Object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        where = value;

        return this;
      },
      /**
       * Sorts the query
       * @param {string|Object} value
       */
      sort(value: string | object) {
        sorts.push(value);

        return this;
      },
      /**
       * Limits results returned by the query
       * @param {Number} value
       */
      limit(value: number) {
        limit = value;

        return this;
      },
      /**
       * Skips records returned by the query
       * @param {Number} value
       */
      skip(value: number) {
        skip = value;

        return this;
      },
      /**
       * Pages records returned by the query
       * @param {Number} [page=1] - Page to return - Starts at 1
       * @param {Number} [limit=10] - Number of records to return
       */
      paginate({
        page = 1,
        limit: paginateLimit = 10,
      }: PaginateOptions) {
        const safePage = Math.max(page, 1);
        this.skip((safePage * paginateLimit) - paginateLimit);
        this.limit(paginateLimit);

        return this;
      },
      async then(resolve: (result: TEntity[]) => void, reject: (err: Error) => void) {
        try {
          if (_.isString(where)) {
            reject(new Error('The query cannot be a string, it must be an object'));
          }

          const {
            query,
            params,
          } = SqlHelper.getSelectQueryAndParams({
            modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
            schema: modelInstance._schema,
            select,
            where,
            sorts,
            skip: skip || 0,
            limit: limit || 0,
          });

          const results = await modelInstance._readonlyPool.query(query, params);
          resolve(modelInstance._buildInstances(results.rows));
        } catch (ex) {
          ex.stack += stack;
          reject(ex);
        }
      },
    };
  }

  /**
   * Gets a count of rows matching the where query
   * @param {Object} [where] - Object representing the where query
   * @returns {Number} Number of records matching the where criteria
   */
  public count(where?: WhereQuery): CountResult<TEntity> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.count()`);
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
      async then(resolve: (result: number) => void, reject: (err: Error) => void) {
        try {
          const {
            query,
            params,
          } = SqlHelper.getCountQueryAndParams({
            modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
            schema: modelInstance._schema,
            where,
          });

          const result = await modelInstance._pool.query(query, params);

          const originalValue = result.rows[0].count;
          const value = Number(originalValue);
          if (_.isFinite(value) && Number.isSafeInteger(value)) {
            return resolve(value);
          }

          // If the count is greater than MAX_SAFE_INT, return value as a string
          return resolve(originalValue);
        } catch (ex) {
          ex.stack += stack;
          reject(ex);
        }
      },
    };
  }
  public async create(values: Partial<TEntity>, options?: CreateUpdateDeleteOptions): Promise<TEntity>;
  /**
   * Creates a objects using the specified values
   * @param {object|object[]} values - Values to insert as multiple new objects.
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async create(values: Partial<TEntity> | Array<Partial<TEntity>>, options: DoNotReturnRecords): Promise<boolean>;
  /**
   * Creates a objects using the specified values
   * @param {object[]} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async create(values: Array<Partial<TEntity>>, options?: CreateUpdateDeleteOptions): Promise<TEntity[]>;
  /**
   * Creates an object using the specified values
   * @param {Object|Object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {Object} Return value from the db
   */
  public async create(values: Partial<TEntity> | Array<Partial<TEntity>>, {
    returnRecords = true,
    returnSelect,
  }: CreateUpdateDeleteOptions = {
    returnRecords: true,
  }): Promise<TEntity | TEntity[] | boolean> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.create()`);
    try {
      if (_.isArray(values) && !values.length) {
        return [];
      }

      const beforeCreate = this._schema.beforeCreate;

      if (beforeCreate) {
        if (Array.isArray(values)) {
          // tslint:disable-next-line:no-parameter-reassignment
          values = await Promise.all(values.map(beforeCreate)) as Array<Partial<TEntity>>;
        } else {
          // tslint:disable-next-line:no-parameter-reassignment
          values = await beforeCreate(values) as Partial<TEntity>;
        }
      }

      const {
        query,
        params,
      } = SqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId: this._modelSchemasByGlobalId,
        schema: this._schema,
        values,
        returnRecords,
        returnSelect,
      });

      const results = await this._pool.query(query, params);
      if (returnRecords) {
        if (_.isArray(values)) {
          return this._buildInstances(results.rows);
        }

        if (results.rows.length) {
          return this._buildInstance(results.rows[0]);
        }

        throw new Error(('Unknown error getting created rows back from the database'));
      }

      return true;
    } catch (ex) {
      ex.stack += stack;
      throw ex;
    }
  }

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<TEntity>, options: DoNotReturnRecords): Promise<boolean>;
  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {Object} [options] - Values to update
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {boolean}
   */
  public async update(where: WhereQuery, values: Partial<TEntity>, options?: CreateUpdateDeleteOptions): Promise<TEntity[]>;
  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {Object[]} Return values from the db or `true` if returnRecords=false
   */
  public async update(where: WhereQuery, values: Partial<TEntity>, {
    returnRecords = true,
    returnSelect,
  }: CreateUpdateDeleteOptions = {
    returnRecords: true,
  }): Promise<TEntity[] | boolean> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.update()`);
    try {
      const beforeUpdate = this._schema.beforeUpdate;

      if (_.isString(where)) {
        throw new Error('The query cannot be a string, it must be an object');
      }

      if (beforeUpdate) {
        // tslint:disable-next-line:no-parameter-reassignment
        values = await beforeUpdate(values) as Partial<TEntity>;
      }

      const {
        query,
        params,
      } = SqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId: this._modelSchemasByGlobalId,
        schema: this._schema,
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
    } catch (ex) {
      ex.stack += stack;
      throw ex;
    }
  }

  /**
   * Destroys object(s) matching the where query
   * @param {Object} where - Object representing the where query
   * @param {{returnRecords: false}} options
   * @returns {boolean}
   */
  public destroy(where: WhereQuery, options: DoNotReturnRecords): DestroyResult<TEntity, boolean>;
  /**
   * Destroys object(s) matching the where query
   * @param {Object} where - Object representing the where query
   * @param {Object} [options] - Determines if inserted records should be returned
   * @param {Boolean} [options.returnRecords=true] - Determines if inserted records should be returned
   * @returns {boolean}
   */
  public destroy(where?: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<TEntity, TEntity[]>;
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
  }): DestroyResult<TEntity, TEntity[] | boolean> {
    const {
      stack,
    } = new Error(`${this._schema.globalId}.destroy()`);
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
      async then(resolve: (result: TEntity[] | boolean) => void, reject: (err: Error) => void) {
        try {
          if (_.isString(where)) {
            reject(new Error('The query cannot be a string, it must be an object'));
          }

          const {
            query,
            params,
          } = SqlHelper.getDeleteQueryAndParams({
            modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
            schema: modelInstance._schema,
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

  /**
   * Attach instance functions to specified results
   * @param {Object[]} results
   * @private
   */
  private _buildInstances(results: TEntity[]): TEntity[] {
    if (_.isNil(results)) {
      return results;
    }

    if (!this._hasInstanceFunctions && !this._floatProperties.length && !this._intProperties.length) {
      return results;
    }

    return results.map((result) => this._buildInstance(result));
  }

  /**
   * Attach instance functions to specified results
   * @param {Object} result
   * @returns {Object} Instance of model object
   * @private
   */
  private _buildInstance(result: TEntity): TEntity {
    if (_.isNil(result)) {
      return result;
    }

    let instance = result;
    if (this._hasInstanceFunctions) {
      // Inherit functions defined in the `this._instance` object and assign values from `result`
      instance = _.create(this._instance, result);
    }

    for (const name of this._floatProperties) {
      const originalValue = result[name];
      if (originalValue !== null) {
        try {
          const value = Number(originalValue);
          if (_.isFinite(value) && value.toString() === originalValue) {
            instance[name] = value;
          }
        } catch (ex) {
          // Ignore and leave value as original
        }
      }
    }

    for (const name of this._intProperties) {
      const originalValue = result[name];
      if (originalValue !== null) {
        try {
          const valueAsNumber = Number(originalValue);
          if (_.isFinite(valueAsNumber) && valueAsNumber.toString() === originalValue) {
            const valueAsInt = _.toInteger(valueAsNumber);
            if (Number.isSafeInteger(valueAsInt)) {
              instance[name] = valueAsInt;
            }
          }
        } catch (ex) {
          // Ignore and leave value as original
        }
      }
    }

    return instance;
  }
}
