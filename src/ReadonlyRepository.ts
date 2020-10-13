import _ from 'lodash';
import { Pool } from 'postgres-pool';
import { Entity, EntityFieldValue, EntityStatic } from './Entity';
import {
  CountResult, //
  FindArgs,
  FindOneArgs,
  FindOneResult,
  FindResult,
  PaginateOptions,
  PopulateArgs,
  WhereQuery,
} from './query';
// eslint-disable-next-line import/no-cycle
import { getCountQueryAndParams, getSelectQueryAndParams } from './SqlHelper';
import {
  ColumnCollectionMetadata, //
  ColumnModelMetadata,
  ColumnTypeMetadata,
  ModelMetadata,
} from './metadata';
// eslint-disable-next-line import/no-cycle
import { RepositoriesByModelNameLowered } from './RepositoriesByModelNameLowered';

export interface RepositoryOptions<T extends Entity> {
  modelMetadata: ModelMetadata<T>;
  type: EntityStatic<T>;
  repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
  pool: Pool;
  readonlyPool?: Pool;
}

export class ReadonlyRepository<T extends Entity> {
  private readonly _modelMetadata: ModelMetadata<T>;

  protected _type: EntityStatic<T>;

  protected _pool: Pool;

  protected _readonlyPool: Pool;

  protected _repositoriesByModelNameLowered: RepositoriesByModelNameLowered;

  protected _floatProperties: string[] = [];

  protected _intProperties: string[] = [];

  public constructor({ modelMetadata, type, pool, readonlyPool, repositoriesByModelNameLowered }: RepositoryOptions<T>) {
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

  public get model(): ModelMetadata<T> {
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
    const { stack } = new Error(`${this.model.name}.findOne()`);

    let select: string[] | undefined;
    let where: WhereQuery = {};
    let sort: string | string[] | null = null;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          select = value as string[] | undefined;
          break;
        case 'where':
          where = value as WhereQuery;
          break;
        case 'sort':
          sort = value as string | string[] | null;
          break;
        default:
          select = undefined;
          where = args as WhereQuery;
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
    const sorts: (string | Record<string, number | string>)[] = [];
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
      where(value: WhereQuery): FindOneResult<T> {
        where = value;

        return this;
      },
      /**
       * Populates/hydrates relations
       * @param {string} propertyName - Name of property to join
       * @param {object} [options] - Populate options
       * @param {object} [options.where] - Object representing the where query
       * @param {string[]} [options.select] - Array of model property names to return from the query.
       * @param {string|object} [options.sort] - Property name(s) to sort by
       * @param {string|number} [options.skip] - Number of records to skip
       * @param {string|number} [options.limit] - Number of results to return
       */
      populate(
        propertyName: Extract<keyof T, string>,
        {
          where: populateWhere, //
          select: populateSelect,
          sort: populateSort,
          skip: populateSkip,
          limit: populateLimit,
        }: PopulateArgs = {},
      ): FindOneResult<T> {
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
      sort(value: string | Record<string, number | string>): FindOneResult<T> {
        sorts.push(value);

        return this;
      },
      async then(resolve: (result: T | null) => T | Promise<T> | null, reject: (err: Error) => void): Promise<T | null> {
        try {
          if (_.isString(where)) {
            throw new Error('The query cannot be a string, it must be an object');
          }

          const { query, params } = getSelectQueryAndParams({
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
              if (modelColumn.model) {
                const populateRepository = modelInstance._repositoriesByModelNameLowered[modelColumn.model.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository by entity name: ${modelColumn.model}. From ${column.target}#${column.propertyName}`);
                }

                if (!populateRepository.model.primaryKeyColumn) {
                  throw new Error(`Unable to populate ${modelColumn.model} from ${column.target}#${column.propertyName}. There is no primary key defined in ${modelColumn.model}`);
                }

                const populateWhere = {
                  [populateRepository.model.primaryKeyColumn.propertyName]: result[populate.propertyName] as EntityFieldValue,
                  ...populate.where,
                };

                populateQueries.push(
                  (async function populateModel(): Promise<void> {
                    const populateResult = await populateRepository.findOne({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                    });

                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                    result[populate.propertyName] = populateResult;
                  })(),
                );
              } else if (collectionColumn.collection) {
                const populateRepository = modelInstance._repositoriesByModelNameLowered[collectionColumn.collection.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository for collection by name ${collectionColumn.collection}. From ${column.target}#${populate.propertyName}`);
                }

                const populateModelPrimaryKeyColumn = populateRepository.model.primaryKeyColumn;
                if (!populateModelPrimaryKeyColumn) {
                  throw new Error(
                    `Unable to populate ${collectionColumn.collection} objects from ${column.target}#${column.propertyName}. There is no primary key defined in ${collectionColumn.collection}`,
                  );
                }

                const { primaryKeyColumn } = modelInstance.model;
                if (!primaryKeyColumn) {
                  throw new Error(`Unable to populate ${column.target}#${column.propertyName}. There is no primary key defined in ${modelInstance.model.name}`);
                }

                const id = result[primaryKeyColumn.propertyName] as EntityFieldValue;
                if (_.isNil(id)) {
                  throw new Error(`Primary key (${primaryKeyColumn.propertyName}) has no value for entity ${column.target}.`);
                }

                if (collectionColumn.through) {
                  const throughRepository = modelInstance._repositoriesByModelNameLowered[collectionColumn.through.toLowerCase()];
                  if (!throughRepository) {
                    throw new Error(`Unable to find repository for multi-map collection: ${collectionColumn.through}. From ${column.target}#${populate.propertyName}`);
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
                    throw new Error(`Unable to find property on related model for multi-map collection: ${collectionColumn.through}. From ${column.target}#${populate.propertyName}`);
                  }

                  populateQueries.push(
                    (async function populateMultiMulti(): Promise<void> {
                      if (relatedModelColumn) {
                        const mapRecords = await throughRepository.find({
                          select: [relatedModelColumn.via],
                          where: {
                            [collectionColumn.via]: id,
                          },
                        });
                        const ids = _.map(mapRecords, relatedModelColumn.via);

                        const populateWhere = _.merge(
                          {
                            [populateModelPrimaryKeyColumn.propertyName]: ids,
                          },
                          populate.where,
                        );

                        const populateResults = await populateRepository.find({
                          select: populate.select,
                          where: populateWhere,
                          sort: populate.sort,
                          skip: populate.skip,
                          limit: populate.limit,
                        });

                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                        result[populate.propertyName] = populateResults;
                      }
                    })(),
                  );
                } else {
                  const populateWhere = {
                    [collectionColumn.via]: id,
                    ...populate.where,
                  };

                  populateQueries.push(
                    (async function populateCollection(): Promise<void> {
                      const populateResults = await populateRepository.find({
                        select: populate.select,
                        where: populateWhere,
                        sort: populate.sort,
                        skip: populate.skip,
                        limit: populate.limit,
                      });

                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore - Ignoring result does not have index signature for known field (populate.propertyName)
                      result[populate.propertyName] = populateResults;
                    })(),
                  );
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
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += stack;
          } else {
            typedException.stack = stack;
          }

          reject(typedException);

          return null;
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
    const { stack } = new Error(`${this.model.name}.find()`);

    let select: string[] | undefined;
    let where: WhereQuery = {};
    let sort: string | string[] | null = null;
    let skip: number | null = null;
    let limit: number | null = null;
    // Args can be a FindArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          select = value as string[];
          break;
        case 'where':
          where = value as WhereQuery;
          break;
        case 'sort':
          sort = value as string | string[] | null;
          break;
        case 'skip':
          skip = value as number | null;
          break;
        case 'limit':
          limit = value as number | null;
          break;
        default:
          select = undefined;
          where = args as WhereQuery;
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

    const sorts: (string | Record<string, number | string>)[] = [];
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
      where(value: WhereQuery): FindResult<T> {
        where = value;

        return this;
      },
      /**
       * Sorts the query
       * @param {string|object} value
       */
      sort(value: string | Record<string, number | string>): FindResult<T> {
        sorts.push(value);

        return this;
      },
      /**
       * Limits results returned by the query
       * @param {number} value
       */
      limit(value: number): FindResult<T> {
        limit = value;

        return this;
      },
      /**
       * Skips records returned by the query
       * @param {number} value
       */
      skip(value: number): FindResult<T> {
        skip = value;

        return this;
      },
      /**
       * Pages records returned by the query
       * @param {number} [page=1] - Page to return - Starts at 1
       * @param {number} [limit=10] - Number of records to return
       */
      paginate({ page = 1, limit: paginateLimit = 10 }: PaginateOptions): FindResult<T> {
        const safePage = Math.max(page, 1);
        return this.skip(safePage * paginateLimit - paginateLimit).limit(paginateLimit);
      },
      async then(resolve: (result: T[]) => T[], reject: (err: Error) => void): Promise<T[]> {
        try {
          if (_.isString(where)) {
            reject(new Error('The query cannot be a string, it must be an object'));
            return [];
          }

          const { query, params } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select,
            where,
            sorts,
            skip: skip || 0,
            limit: limit || 0,
          });

          const results = await modelInstance._readonlyPool.query(query, params);
          return resolve(modelInstance._buildInstances(results.rows));
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += stack;
          } else {
            typedException.stack = stack;
          }

          reject(typedException);
          return [];
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
    const { stack } = new Error(`${this.model.name}.count()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery): CountResult<T> | number {
        // eslint-disable-next-line no-param-reassign
        where = value;

        return this;
      },
      async then(resolve: (result: number) => number, reject: (err: Error) => void): Promise<number> {
        try {
          const { query, params } = getCountQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            where,
          });

          const result = await modelInstance._pool.query<{ count: string }>(query, params);

          const originalValue = result.rows[0].count;
          return resolve(Number(originalValue));
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += stack;
          } else {
            typedException.stack = stack;
          }

          reject(typedException);
          return 0;
        }
      },
    };
  }

  protected _buildInstance(row: Partial<T>): T {
    if (_.isNil(row)) {
      return row;
    }

    const instance = new this._type();
    Object.assign(instance, row);

    // NOTE: Number fields may be strings coming from the db. In those cases, try to convert the value to Number
    for (const name of this._floatProperties) {
      const originalValue = row[name] as string | number | undefined | null;
      if (!_.isNil(originalValue) && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (_.isFinite(value) && value.toString() === originalValue) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - string cannot be used to index type T
            instance[name] = value;
          }
        } catch (ex) {
          // Ignore and leave value as original
        }
      }
    }

    for (const name of this._intProperties) {
      const originalValue = row[name] as string | number | undefined | null;
      if (!_.isNil(originalValue) && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (_.isFinite(value) && value.toString() === originalValue) {
            const valueAsInt = _.toInteger(value);
            if (Number.isSafeInteger(valueAsInt)) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - string cannot be used to index type T
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

  protected _buildInstances(rows: Partial<T>[]): T[] {
    if (_.isNil(rows)) {
      return rows;
    }

    return rows.map((row: Partial<T>) => this._buildInstance(row));
  }
}
