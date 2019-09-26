import _ from 'lodash';
import { Pool } from 'postgres-pool';
import { Entity, EntityStatic } from './Entity';
import {
  CountResult,
  FindArgs,
  FindOneArgs,
  FindOneResult,
  FindResult,
  PaginateOptions,
  PopulateArgs,
  WhereQuery,
} from './query';
// eslint-disable-next-line import/no-cycle
import {
  getCountQueryAndParams,
  getSelectQueryAndParams,
} from './SqlHelper';
import {
  ColumnCollectionMetadata,
  ColumnModelMetadata,
  ColumnTypeMetadata,
  ModelMetadata,
} from './metadata';
// eslint-disable-next-line import/no-cycle
import { RepositoriesByModelNameLowered } from './RepositoriesByModelNameLowered';

export interface RepositoryOptions<T extends Entity> {
  modelMetadata: ModelMetadata;
  type: EntityStatic<T>;
  repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
  pool: Pool;
  readonlyPool?: Pool;
}

export class ReadonlyRepository<T extends Entity> {
  protected _type: EntityStatic<T>;

  protected _pool: Pool;

  protected _readonlyPool: Pool;

  protected _repositoriesByModelNameLowered: RepositoriesByModelNameLowered;

  protected _floatProperties: string[] = [];

  protected _intProperties: string[] = [];

  private readonly _modelMetadata: ModelMetadata;

  public constructor({
                modelMetadata,
                type,
                pool,
                readonlyPool,
                repositoriesByModelNameLowered,
              }: RepositoryOptions<T>) {
    this._modelMetadata = modelMetadata;
    this._type = type;
    this._pool = pool;
    this._readonlyPool = readonlyPool || pool;
    this._repositoriesByModelNameLowered = repositoriesByModelNameLowered;

    for (const column of modelMetadata.columns) {
      if ((column as ColumnTypeMetadata).type === 'float') {
        this._floatProperties.push(column.propertyName);
      } else if ((column as ColumnTypeMetadata).type === 'integer') {
        this._intProperties.push(column.propertyName);
      }
    }
  }

  public get model(): ModelMetadata {
    return this._modelMetadata;
  }

  /**
   * Gets a single object
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
   */
  public findOne(args: FindOneArgs | WhereQuery = {}): FindOneResult<T> {
    const {
      stack,
    } = new Error(`${this.model.name}.findOne()`);

    let select: string[] | undefined;
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
          select = undefined;
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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        where = value;

        return this;
      },
      /**
       * Populates/hydrates relations
       * @param {string} propertyName - Name of property to join
       * @param {object} [where] - Object representing the where query
       * @param {string[]} [populateSelect] - Array of model property names to return from the query.
       * @param {string|object} [populateSort] - Property name(s) to sort by
       * @param {string|number} [populateSkip] - Number of records to skip
       * @param {string|number} [populateLimit] - Number of results to return
       */
      populate(propertyName: Extract<keyof T, string>, {
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
       * @param {string|object} value
       */
      sort(value: string | object) {
        sorts.push(value);

        return this;
      },
      async then(resolve: (result: T | null) => (T | Promise<T> | null), reject: (err: Error) => (void | Promise<void>) | undefined): Promise<T | null | Error | void | undefined> {
        try {
          if (_.isString(where)) {
            throw new Error('The query cannot be a string, it must be an object');
          }

          const {
            query,
            params,
          } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select,
            where,
            sorts,
            limit: 1,
            skip: 0,
          });

          const results = await modelInstance._readonlyPool.query(query, params);
          if (results.rows && results.rows.length) {
            const result = modelInstance._buildInstance(results.rows[0] as Partial<T>);

            const populateQueries = [];
            for (const populate of populates) {
              const column = modelInstance.model.columnsByPropertyName[populate.propertyName];
              if (!column) {
                throw new Error(`Unable to find ${populate.propertyName} on ${modelInstance.model.name} model for populating.`);
              }

              const modelColumn = column as ColumnModelMetadata;
              const collectionColumn = column as ColumnCollectionMetadata;
              if (modelColumn.target) {
                const populateRepository = modelInstance._repositoriesByModelNameLowered[modelColumn.target.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository by entity name: ${modelColumn.target}. Column ${column.propertyName} on model: ${column.target}`);
                }

                if (!populateRepository.model.primaryKeyColumn) {
                  throw new Error(`Unable to populate ${modelColumn.target} from ${column.target}.${column.propertyName}. There is no primary key defined in ${modelColumn.target}`);
                }

                const populateWhere = _.merge({
                  // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                  [populateRepository.model.primaryKeyColumn.propertyName]: result[populate.propertyName],
                }, populate.where);

                populateQueries.push(async () => {
                  const populateResult = await populateRepository.findOne({
                    select: populate.select,
                    where: populateWhere,
                    sort: populate.sort,
                  });

                  // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                  result[populate.propertyName] = populateResult;
                });
              } else if (collectionColumn.collection) {
                const populateRepository = modelInstance._repositoriesByModelNameLowered[collectionColumn.collection.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository for collection by name ${collectionColumn.collection}. For ${populate.propertyName} property on model: ${column.target}`);
                }

                const populateModelPrimaryKeyColumn = populateRepository.model.primaryKeyColumn;
                if (!populateModelPrimaryKeyColumn) {
                  throw new Error(`Unable to populate ${collectionColumn.collection} objects from ${column.target}.${column.propertyName}. There is no primary key defined in ${collectionColumn.collection}`);
                }

                const { primaryKeyColumn } = modelInstance.model;
                if (!primaryKeyColumn) {
                  throw new Error(`Unable to populate ${column.target}.${column.propertyName}. There is no primary key defined in ${modelInstance.model.name}`);
                }

                // @ts-ignore - Ignoring result does not have index signature for known field (primaryKeyColumn.propertyName)
                const id = result[primaryKeyColumn.propertyName];
                if (_.isNil(id)) {
                  throw new Error(`Primary key (${primaryKeyColumn.propertyName}) has no value for entity ${column.target}.`);
                }

                if (collectionColumn.through) {
                  const throughRepository = modelInstance._repositoriesByModelNameLowered[collectionColumn.through.toLowerCase()];
                  if (!throughRepository) {
                    throw new Error(`Unable to find repository for multi-map collection: ${collectionColumn.through}. For ${populate.propertyName} property on model: ${column.target}`);
                  }

                  let relatedModelColumn: ColumnCollectionMetadata | undefined;
                  for (const populateModelColumn of populateRepository.model.columns) {
                    const { through } = populateModelColumn as ColumnCollectionMetadata;
                    if (through && through.toLowerCase() === collectionColumn.through.toLowerCase()) {
                      relatedModelColumn = populateModelColumn as ColumnCollectionMetadata;
                      break;
                    }
                  }

                  if (!relatedModelColumn) {
                    throw new Error(`Unable to find property on related model for multi-map collection: ${collectionColumn.through}. Coming from ${populate.propertyName} property on model: ${column.target}`);
                  }

                  populateQueries.push(async () => {
                    if (relatedModelColumn) {
                      const mapRecords = await throughRepository.find({
                        select: [relatedModelColumn.via],
                        where: {
                          [collectionColumn.via]: id,
                        },
                      });
                      const ids = _.map(mapRecords, relatedModelColumn.via);

                      const populateWhere = _.merge({
                        [populateModelPrimaryKeyColumn.propertyName]: ids,
                      }, populate.where);

                      const populateResults = await populateRepository.find({
                        select: populate.select,
                        where: populateWhere,
                        sort: populate.sort,
                        skip: populate.skip,
                        limit: populate.limit,
                      });

                      // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                      result[populate.propertyName] = populateResults;
                    }
                  });
                } else {
                  const populateWhere = _.merge({
                    [collectionColumn.via]: id,
                  }, populate.where);

                  populateQueries.push(async () => {
                    const populateResults = await populateRepository.find({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                      skip: populate.skip,
                      limit: populate.limit,
                    });

                    // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                    result[populate.propertyName] = populateResults;
                  });
                }
              }
            }

            if (populateQueries.length) {
              await Promise.all(populateQueries);
            }

            return resolve(result as T);
          }

          return resolve(null);
        } catch (ex) {
          ex.stack += stack;
          return reject(ex);
        }
      },
    };
  }

  /**
   * Gets a collection of objects
   * @param {object} [args] - Arguments
   * @param {string[]} [args.select] - Array of model property names to return from the query.
   * @param {object} [args.where] - Object representing the where query
   * @param {string|object|string[]|object[]} [args.sort] - Property name(s) to sort by
   * @param {string|number} [args.skip] - Number of records to skip
   * @param {string|number} [args.limit] - Number of results to return
   */
  public find(args: FindArgs | WhereQuery = {}): FindResult<T> {
    const {
      stack,
    } = new Error(`${this.model.name}.find()`);

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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        where = value;

        return this;
      },
      /**
       * Sorts the query
       * @param {string|object} value
       */
      sort(value: string | object) {
        sorts.push(value);

        return this;
      },
      /**
       * Limits results returned by the query
       * @param {number} value
       */
      limit(value: number) {
        limit = value;

        return this;
      },
      /**
       * Skips records returned by the query
       * @param {number} value
       */
      skip(value: number) {
        skip = value;

        return this;
      },
      /**
       * Pages records returned by the query
       * @param {number} [page=1] - Page to return - Starts at 1
       * @param {number} [limit=10] - Number of records to return
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
      async then(resolve: (result: T[]) => void, reject: (err: Error) => void) {
        try {
          if (_.isString(where)) {
            reject(new Error('The query cannot be a string, it must be an object'));
          }

          const {
            query,
            params,
          } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
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
   * @param {object} [where] - Object representing the where query
   * @returns {number} Number of records matching the where criteria
   */
  public count(where?: WhereQuery): CountResult<T> {
    const {
      stack,
    } = new Error(`${this.model.name}.count()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery) {
        // eslint-disable-next-line no-param-reassign
        where = value;

        return this;
      },
      async then(resolve: (result: number) => void, reject: (err: Error) => void) {
        try {
          const {
            query,
            params,
          } = getCountQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
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
          return reject(ex);
        }
      },
    };
  }

  protected _buildInstance(row: Partial<T>): T {
    const instance = new this._type() as T;
    Object.assign(instance, row);

    // NOTE: Number fields may be strings coming from the db. In those cases, try to convert the value to Number
    for (const name of this._floatProperties) {
      // @ts-ignore
      const originalValue = (row[name]) as string | number | undefined | null;
      if (!_.isNil(originalValue) && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (_.isFinite(value) && value.toString() === originalValue) {
            // @ts-ignore
            instance[name] = value;
          }
        } catch (ex) {
          // Ignore and leave value as original
        }
      }
    }

    for (const name of this._intProperties) {
      // @ts-ignore
      const originalValue = (row[name]) as string | number | undefined | null;
      if (!_.isNil(originalValue) && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (_.isFinite(value) && value.toString() === originalValue) {
            const valueAsInt = _.toInteger(value);
            if (Number.isSafeInteger(valueAsInt)) {
              // @ts-ignore
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

  protected _buildInstances(rows: Array<Partial<T>>): T[] {
    if (_.isNil(rows)) {
      return rows;
    }

    return rows.map(this._buildInstance);
  }
}
