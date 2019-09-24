import * as _ from 'lodash';
import { Entity } from './Entity';
import { FindOneArgs } from './query/FindOneArgs';
import { WhereQuery } from './query/WhereQuery';
import { FindOneResult } from './query/FindOneResult';
import { FindArgs } from './query/FindArgs';
import { FindResult } from './query/FindResult';
import { CountResult } from './query/CountResult';
import { ModelSchema } from './schema/ModelSchema';
import { PopulateArgs } from './query/PopulateArgs';
import { SqlHelper } from './SqlHelper';
import { Pool } from 'postgres-pool';
import { EntityMetadata } from './metadata/EntityMetadata';
import { ColumnTypeMetadata } from './metadata/ColumnTypeMetadata';
import { ColumnModelMetadata } from './metadata/ColumnModelMetadata';
import { ColumnCollectionMetadata } from './metadata/ColumnCollectionMetadata';

export interface RepositoryOptions<T extends Entity> {
  entityMetadata: EntityMetadata;
  type: new() => T;
  repositoriesByEntityNameLowered: { [index: string]: ReadonlyRepository<T> };
  pool: Pool;
  readonlyPool?: Pool;
}

export class ReadonlyRepository<T extends Entity> {

  get entity(): EntityMetadata {
    return this._entityMetadata;
  }
  protected _type: new() => T;
  protected _pool: Pool;
  protected _readonlyPool: Pool;
  protected _repositoriesByEntityNameLowered: { [index: string]: ReadonlyRepository<T> };
  protected _floatProperties: string[] = [];
  protected _intProperties: string[] = [];
  private _entityMetadata: EntityMetadata;

  constructor({
                entityMetadata,
                type,
                pool,
                readonlyPool,
                repositoriesByEntityNameLowered,
              }: RepositoryOptions<T>) {
    this._entityMetadata = entityMetadata;
    this._type = type;
    this._pool = pool;
    this._readonlyPool = readonlyPool || pool;
    this._repositoriesByEntityNameLowered = repositoriesByEntityNameLowered;

    for (const column of entityMetadata.columns) {
      if ((column as ColumnTypeMetadata).type === 'float') {
        this._floatProperties.push(column.propertyName);
      } else if ((column as ColumnTypeMetadata).type === 'integer') {
        this._intProperties.push(column.propertyName);
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
  public findOne(args: FindOneArgs | WhereQuery = {}): FindOneResult<T> {
    const {
      stack,
    } = new Error(`${this.entity.name}.findOne()`);

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

    // tslint:disable-next-line:no-this-assignment
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
       * @param {string[]} [populateSelect] - Array of model property names to return from the query.
       * @param {string|Object} [populateSort] - Property name(s) to sort by
       * @param {string|Number} [populateSkip] - Number of records to skip
       * @param {string|Number} [populateLimit] - Number of results to return
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
       * @param {string|Object} value
       */
      sort(value: string | object) {
        sorts.push(value);

        return this;
      },
      async then(resolve: (result: T | null) => void, reject: (err: Error) => void) {
        try {
          if (_.isString(where)) {
            throw new Error('The query cannot be a string, it must be an object');
          }

          const {
            query,
            params,
          } = SqlHelper.getSelectQueryAndParams({
            repositoriesByEntityNameLowered: modelInstance._repositoriesByEntityNameLowered,
            entity: modelInstance.entity,
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
              const column = modelInstance.entity.columnsByPropertyName[populate.propertyName];
              if (!column) {
                throw new Error(`Unable to find ${populate.propertyName} on ${modelInstance.entity.name} model for populating.`);
              }

              const modelColumn = column as ColumnModelMetadata;
              const collectionColumn = column as ColumnCollectionMetadata;
              if (modelColumn.model) {
                const populateRepository = modelInstance._repositoriesByEntityNameLowered[modelColumn.model.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository by entity name: ${modelColumn.model}. Column ${column.propertyName} on entity: ${column.entity}`);
                }

                const primaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  entity: populateRepository.entity,
                });

                const populateWhere = _.merge({
                  [primaryKeyName]: result[populate.propertyName],
                }, populate.where);

                populateQueries.push(async function populateSingle() {
                  result[populate.propertyName] = await populateRepository.findOne({
                    select: populate.select,
                    where: populateWhere,
                    sort: populate.sort,
                  });
                }());
              } else if (collectionColumn.collection) {
                const populateRepository = modelInstance._repositoriesByEntityNameLowered[collectionColumn.collection.toLowerCase()];
                if (!populateRepository) {
                  throw new Error(`Unable to find populate repository for collection by name ${collectionColumn.collection}. For ${populate.propertyName} property on entity: ${column.entity}`);
                }

                const populateModelPrimaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  entity: populateRepository.entity,
                });

                const primaryKeyName = SqlHelper.getPrimaryKeyPropertyName({
                  entity: populateRepository.entity,
                });

                const id = result[primaryKeyName];
                if (_.isUndefined(id)) {
                  throw new Error(`Primary key (${primaryKeyName}) has no value for entity ${column.entity}.`);
                }

                if (collectionColumn.through) {
                  const throughRepository = modelInstance._repositoriesByEntityNameLowered[collectionColumn.through.toLowerCase()];
                  if (!throughRepository) {
                    throw new Error(`Unable to find repository for multi-map collection by global id ${collectionColumn.through}. For ${populate.propertyName} property on entity: ${column.entity}`);
                  }

                  let relatedEntityColumn: ColumnCollectionMetadata | null = null;
                  for (const populateEntityColumn of populateRepository.entity.columns) {
                    const through = (populateEntityColumn as ColumnCollectionMetadata).through;
                    if (through && through.toLowerCase() === collectionColumn.through.toLowerCase()) {
                      relatedEntityColumn = populateEntityColumn as ColumnCollectionMetadata;
                      break;
                    }
                  }

                  if (!relatedEntityColumn) {
                    throw new Error(`Unable to find property on related model for multi-map collection. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                  }

                  populateQueries.push(async function populateMultiMapCollection() {
                    const mapRecords = await throughRepository.find({
                      select: [relatedEntityColumn.via],
                      where: {
                        [collectionColumn.via]: id,
                      },
                    });
                    const ids = _.map(mapRecords, relatedEntityColumn.via);

                    const populateWhere = _.merge({
                      [populateModelPrimaryKeyName]: ids,
                    }, populate.where);

                    result[populate.propertyName] = await populateRepository.find({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                      skip: populate.skip,
                      limit: populate.limit,
                    });
                  });
                } else {
                  const populateWhere = _.merge({
                    [collectionColumn.via]: id,
                  }, populate.where);

                  populateQueries.push(async function populateCollection() {
                    result[populate.propertyName] = await populateRepository.find({
                      select: populate.select,
                      where: populateWhere,
                      sort: populate.sort,
                      skip: populate.skip,
                      limit: populate.limit,
                    });
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
          reject(ex);
        }
      },
    };
  }

  private _buildInstance(row: Partial<Entity>): Entity {
    const instance = new this._type();
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
}
