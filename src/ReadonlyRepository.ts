import _ from 'lodash';
import type { Pool } from 'postgres-pool';

import type { Entity, EntityFieldValue, EntityStatic } from './Entity';
import type { IReadonlyRepository } from './IReadonlyRepository';
import type { IRepository } from './IRepository';
import type { ColumnCollectionMetadata, ColumnModelMetadata, ColumnTypeMetadata, ModelMetadata } from './metadata';
import type { CountResult, FindArgs, FindOneArgs, FindOneResult, FindResult, OrderBy, PaginateOptions, PopulateArgs, Sort, WhereQuery, SortObject, SortObjectValue } from './query';
import { getCountQueryAndParams, getSelectQueryAndParams } from './SqlHelper';
import type { GetValueType, PickByValueType, OmitFunctionsAndEntityCollections, QueryResult, PickAsPopulated, PickAsType } from './types';

export interface IRepositoryOptions<T extends Entity> {
  modelMetadata: ModelMetadata<T>;
  type: EntityStatic<T>;
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  pool: Pool;
  readonlyPool?: Pool;
}

interface Populate {
  propertyName: string;
  where?: WhereQuery<Entity>;
  select?: string[];
  sort?: SortObject<Entity> | string;
  skip?: number;
  limit?: number;
}

type PrimaryId = number | string;

export class ReadonlyRepository<T extends Entity> implements IReadonlyRepository<T> {
  private readonly _modelMetadata: ModelMetadata<T>;

  protected _type: EntityStatic<T>;

  protected _pool: Pool;

  protected _readonlyPool: Pool;

  protected _repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;

  protected _floatProperties: string[] = [];

  protected _intProperties: string[] = [];

  public constructor({ modelMetadata, type, pool, readonlyPool, repositoriesByModelNameLowered }: IRepositoryOptions<T>) {
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
   * @param {string|object} [args.sort] - Property name(s) to sort by
   */
  public findOne(args: FindOneArgs<T> | WhereQuery<T> = {}): FindOneResult<T, QueryResult<T>> {
    const { stack } = new Error(`${this.model.name}.findOne()`);

    let select: (string & keyof OmitFunctionsAndEntityCollections<T>)[] | undefined;
    let where: WhereQuery<T> = {};
    let sort: SortObject<T> | string | null = null;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          select = value as (string & keyof OmitFunctionsAndEntityCollections<T>)[];
          break;
        case 'where':
          where = value as WhereQuery<T>;
          break;
        case 'sort':
          sort = value as SortObject<T> | string;
          break;
        default:
          select = undefined;
          where = args as WhereQuery<T>;
          sort = null;
          isWhereCriteria = true;
          break;
      }

      if (isWhereCriteria) {
        break;
      }
    }

    const populates: Populate[] = [];

    interface ManuallySetField {
      propertyName: string;
      value: unknown;
    }

    const manuallySetFields: ManuallySetField[] = [];
    const sorts: OrderBy<T>[] = sort ? this._convertSortsToOrderBy(sort) : [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery<T>): FindOneResult<T, QueryResult<T>> {
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
      populate<TProperty extends string & keyof PickByValueType<T, Entity>>(
        propertyName: TProperty,
        options?: PopulateArgs<GetValueType<PickByValueType<T, Entity>[TProperty], Entity>>,
      ): FindOneResult<T, Omit<QueryResult<T>, TProperty> & PickAsPopulated<T, TProperty>> {
        populates.push({
          propertyName,
          where: options?.where,
          select: options?.select,
          sort: options?.sort,
          skip: options?.skip,
          limit: options?.limit,
        });

        return this as FindOneResult<T, Omit<QueryResult<T>, TProperty> & PickAsPopulated<T, TProperty>>;
      },
      /**
       * Sorts the query
       * @param {string|object} [value]
       */
      sort(value?: Sort<T>): FindOneResult<T, QueryResult<T>> {
        if (value) {
          sorts.push(...modelInstance._convertSortsToOrderBy(value));
        }

        return this;
      },
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity>>(_propertyName: TProperty): FindOneResult<T, Omit<QueryResult<T>, TProperty> & Pick<T, TProperty>> {
        return this;
      },
      UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
        propertyName: TProperty,
        value: TValue,
      ): FindOneResult<T, Omit<QueryResult<T>, TProperty> & PickAsType<T, TProperty, TValue>> {
        manuallySetFields.push({
          propertyName,
          value,
        });

        return this as FindOneResult<T, Omit<QueryResult<T>, TProperty> & PickAsType<T, TProperty, TValue>>;
      },
      async then(resolve: (result: QueryResult<T> | null) => Promise<QueryResult<T>> | QueryResult<T> | null, reject: (err: Error) => void): Promise<QueryResult<T> | null> {
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

          const results = await modelInstance._readonlyPool.query<Partial<QueryResult<T>>>(query, params);
          if (results.rows && results.rows.length) {
            const result = modelInstance._buildInstance(results.rows[0]);

            if (populates.length) {
              await modelInstance.populateFields([result], populates);
            }

            for (const manuallySetField of manuallySetFields) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - Ignoring unknown is not a key
              result[manuallySetField.propertyName as string & keyof T] = manuallySetField.value;
            }

            return await resolve(result);
          }

          return await resolve(null);
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += `\n${stack || ''}`;
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
   * @param {string|object} [args.sort] - Property name(s) to sort by
   * @param {string|number} [args.skip] - Number of records to skip
   * @param {string|number} [args.limit] - Number of results to return
   */
  public find(args: FindArgs<T> | WhereQuery<T> = {}): FindResult<T, QueryResult<T>> {
    const { stack } = new Error(`${this.model.name}.find()`);

    let select: (string & keyof OmitFunctionsAndEntityCollections<T>)[] | undefined;
    let where: WhereQuery<T> = {};
    let sort: SortObject<T> | string | null = null;
    let skip: number | null = null;
    let limit: number | null = null;
    // Args can be a FindArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          select = value as (string & keyof OmitFunctionsAndEntityCollections<T>)[];
          break;
        case 'where':
          where = value as WhereQuery<T>;
          break;
        case 'sort':
          sort = value as SortObject<T> | string;
          break;
        case 'skip':
          skip = value as number;
          break;
        case 'limit':
          limit = value as number;
          break;
        default:
          select = undefined;
          where = args as WhereQuery<T>;
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

    const populates: Populate[] = [];
    const sorts = sort ? this._convertSortsToOrderBy(sort) : [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery<T>): FindResult<T, QueryResult<T>> {
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
      populate<TProperty extends string & keyof PickByValueType<T, Entity>>(
        propertyName: TProperty,
        options?: PopulateArgs<GetValueType<PickByValueType<T, Entity>[TProperty], Entity>>,
      ): FindResult<T, Omit<QueryResult<T>, TProperty> & PickAsPopulated<T, TProperty>> {
        populates.push({
          propertyName,
          where: options?.where,
          select: options?.select,
          sort: options?.sort,
          skip: options?.skip,
          limit: options?.limit,
        });

        // TODO: Figure out the type to make this happy without having to cast to unknown
        return this as unknown as FindResult<T, Omit<QueryResult<T>, TProperty> & PickAsPopulated<T, TProperty>>;
      },
      /**
       * Sorts the query
       * @param {string|string[]|object} [value]
       */
      sort(value?: Sort<T>): FindResult<T, QueryResult<T>> {
        if (value) {
          sorts.push(...modelInstance._convertSortsToOrderBy(value));
        }

        return this;
      },
      /**
       * Limits results returned by the query
       * @param {number} value
       */
      limit(value: number): FindResult<T, QueryResult<T>> {
        limit = value;

        return this;
      },
      /**
       * Skips records returned by the query
       * @param {number} value
       */
      skip(value: number): FindResult<T, QueryResult<T>> {
        skip = value;

        return this;
      },
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity>>(_propertyName: TProperty): FindResult<T, Omit<QueryResult<T>, TProperty> & Pick<T, TProperty>> {
        return this;
      },
      /**
       * Pages records returned by the query
       * @param {number} [page=1] - Page to return - Starts at 1
       * @param {number} [limit=10] - Number of records to return
       */
      paginate({ page = 1, limit: paginateLimit = 10 }: PaginateOptions): FindResult<T, QueryResult<T>> {
        const safePage = Math.max(page, 1);
        return this.skip(safePage * paginateLimit - paginateLimit).limit(paginateLimit);
      },
      async then(resolve: (result: QueryResult<T>[]) => QueryResult<T>[], reject: (err: Error) => void): Promise<QueryResult<T>[]> {
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
          const entities = modelInstance._buildInstances(results.rows);

          if (populates.length) {
            await modelInstance.populateFields(entities, populates);
          }

          return resolve(entities);
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += `\n${stack || ''}`;
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
  public count(where?: WhereQuery<T>): CountResult<T> {
    const { stack } = new Error(`${this.model.name}.count()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       */
      where(value: WhereQuery<T>): CountResult<T> | number {
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
            typedException.stack += `\n${stack || ''}`;
          } else {
            typedException.stack = stack;
          }

          reject(typedException);
          return 0;
        }
      },
    };
  }

  protected _buildInstance(row: Partial<QueryResult<T>>): QueryResult<T> {
    if (_.isNil(row)) {
      return row;
    }

    const instance = new this._type();
    Object.assign(instance, row);

    // NOTE: Number fields may be strings coming from the db. In those cases, try to convert the value to Number
    for (const name of this._floatProperties) {
      const originalValue = row[name as keyof QueryResult<T>] as number | string | null | undefined;
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
      const originalValue = row[name as keyof QueryResult<T>] as number | string | null | undefined;
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

    return instance as unknown as QueryResult<T>;
  }

  protected _buildInstances(rows: Partial<QueryResult<T>>[]): QueryResult<T>[] {
    if (_.isNil(rows)) {
      return rows;
    }

    return rows.map((row: Partial<QueryResult<T>>) => this._buildInstance(row));
  }

  protected _convertSortsToOrderBy(sorts: SortObject<T> | string): OrderBy<T>[] {
    const result: OrderBy<T>[] = [];
    if (sorts) {
      if (Array.isArray(sorts)) {
        for (const sort of sorts as string[]) {
          const parts = sort.trim().split(' ');
          const propertyName = parts.shift() as string & keyof OmitFunctionsAndEntityCollections<T>;
          result.push({
            propertyName,
            descending: /desc/i.test(parts.join('')),
          });
        }
      } else if (_.isString(sorts)) {
        for (const sort of sorts.split(',')) {
          const parts = sort.trim().split(' ');
          const propertyName = parts.shift() as string & keyof OmitFunctionsAndEntityCollections<T>;
          result.push({
            propertyName,
            descending: /desc/i.test(parts.join('')),
          });
        }
      } else if (_.isObject(sorts)) {
        for (const [propertyName, orderValue] of Object.entries(sorts)) {
          let descending = false;
          const order = orderValue as SortObjectValue;
          if (order && (order === -1 || /desc/i.test(`${order}`))) {
            descending = true;
          }

          result.push({
            propertyName: propertyName as string & keyof OmitFunctionsAndEntityCollections<T>,
            descending,
          });
        }
      }
    }

    return result;
  }

  // NOTE: This will mutate `entities`
  protected async populateFields(entities: QueryResult<T>[], populates: Populate[]): Promise<void> {
    if (!entities.length) {
      return;
    }

    const populateQueries: Promise<void>[] = [];
    for (const populate of populates) {
      const column = this.model.columnsByPropertyName[populate.propertyName];
      if (!column) {
        throw new Error(`Unable to find ${populate.propertyName} on ${this.model.name} model for populating.`);
      }

      const modelColumn = column as ColumnModelMetadata;
      const collectionColumn = column as ColumnCollectionMetadata;
      if (modelColumn.model) {
        populateQueries.push(this.populateSingleAssociation(entities, populate, modelColumn));
      } else if (collectionColumn.collection) {
        const populateRepository = this._repositoriesByModelNameLowered[collectionColumn.collection.toLowerCase()];
        if (!populateRepository) {
          throw new Error(`Unable to find populate repository for collection by name ${collectionColumn.collection}. From ${column.target}#${populate.propertyName}`);
        }

        const { primaryKeyColumn } = this.model;
        if (!primaryKeyColumn) {
          throw new Error(`Unable to populate ${column.target}#${column.propertyName}. There is no primary key defined in ${this.model.name}`);
        }

        const entityIds = new Set<EntityFieldValue>();
        for (const entity of entities) {
          const id = entity[primaryKeyColumn.propertyName as keyof QueryResult<T>] as EntityFieldValue;
          if (_.isNil(id)) {
            throw new Error(`Primary key (${primaryKeyColumn.propertyName}) has no value for entity ${column.target}.`);
          }

          entityIds.add(id);
        }

        if (collectionColumn.through) {
          const populateModelPrimaryKeyColumn = populateRepository.model.primaryKeyColumn;
          if (!populateModelPrimaryKeyColumn) {
            throw new Error(
              `Unable to populate ${collectionColumn.collection} objects from ${column.target}#${column.propertyName}. There is no primary key defined in ${collectionColumn.collection}`,
            );
          }

          populateQueries.push(
            this.populateManyManyCollection(
              entities,
              primaryKeyColumn.propertyName as keyof T,
              Array.from(entityIds),
              populateModelPrimaryKeyColumn.propertyName as keyof T,
              populate,
              collectionColumn,
              populateRepository,
            ),
          );
        } else {
          populateQueries.push(this.populateOneManyCollection(entities, primaryKeyColumn.propertyName as keyof T, Array.from(entityIds), populate, collectionColumn, populateRepository));
        }
      }
    }

    if (populateQueries.length) {
      await Promise.all(populateQueries);
    }
  }

  private async populateSingleAssociation(entities: QueryResult<T>[], populate: Populate, column: ColumnModelMetadata): Promise<void> {
    const populateRepository = this._repositoriesByModelNameLowered[column.model.toLowerCase()];
    if (!populateRepository) {
      throw new Error(`Unable to find populate repository by entity name: ${column.model}. From ${column.target}#${column.propertyName}`);
    }

    if (!populateRepository.model.primaryKeyColumn) {
      throw new Error(`Unable to populate ${column.model} from ${column.target}#${column.propertyName}. There is no primary key defined in ${column.model}`);
    }

    const propertyName = populate.propertyName as string & keyof QueryResult<T>;
    const populateIds = new Set<EntityFieldValue>();
    for (const entity of entities) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
      const populateId = entity[propertyName] as EntityFieldValue;
      if (populateId) {
        populateIds.add(populateId);
      }
    }

    const populateWhere: WhereQuery<Entity> = {
      [populateRepository.model.primaryKeyColumn.propertyName]: Array.from(populateIds),
      ...populate.where,
    };

    const populateResults = await populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
    } as FindArgs<Entity>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const populateResultsById = _.keyBy(populateResults, populateRepository.model.primaryKeyColumn.propertyName) as Record<number | string, any>;

    for (const entity of entities) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      entity[propertyName] = populateResultsById[entity[propertyName] as any];
    }
  }

  private async populateOneManyCollection(
    entities: QueryResult<T>[],
    primaryKeyPropertyName: keyof QueryResult<T>,
    entityIds: EntityFieldValue[],
    populate: Populate,
    column: ColumnCollectionMetadata,
    populateRepository: IReadonlyRepository<Entity>,
  ): Promise<void> {
    if (entities.length > 1 && populate.select && !populate.select.includes(column.via)) {
      throw new Error(`Unable to populate "${populate.propertyName}" on ${this.model.name}. "${column.via}" is not included in select array.`);
    }

    const populateWhere = {
      [column.via]: entityIds,
      ...populate.where,
    };

    const populateResults = await populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      skip: populate.skip,
      limit: populate.limit,
    } as FindArgs<Entity>);

    if (entities.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entities[0][populate.propertyName as string & keyof QueryResult<T>] as any) = populateResults;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const populateResultsByEntityId = _.groupBy(populateResults, column.via) as Record<PrimaryId, any>;
      for (const entity of entities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
        const id = entity[primaryKeyPropertyName] as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        entity[populate.propertyName as string & keyof QueryResult<T>] = populateResultsByEntityId[id] || [];
      }
    }
  }

  private async populateManyManyCollection(
    entities: QueryResult<T>[],
    primaryKeyPropertyName: keyof QueryResult<T>,
    entityIds: EntityFieldValue[],
    populateModelPrimaryKeyPropertyName: keyof QueryResult<T>,
    populate: Populate,
    column: ColumnCollectionMetadata,
    populateRepository: IReadonlyRepository<Entity>,
  ): Promise<void> {
    if (!column.through) {
      throw new Error(`Unable to populate multi-map collection: Missing "through" value. From ${column.target}#${populate.propertyName}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const throughRepository = this._repositoriesByModelNameLowered[column.through.toLowerCase()] as IReadonlyRepository<any>;
    if (!throughRepository) {
      throw new Error(`Unable to find repository for multi-map collection: ${column.through}. From ${column.target}#${populate.propertyName}`);
    }

    // Other side of the relation
    let relatedModelColumn: ColumnCollectionMetadata | undefined;
    for (const populateModelColumn of populateRepository.model.columns) {
      const { through } = populateModelColumn as ColumnCollectionMetadata;
      if (through && through.toLowerCase() === column.through.toLowerCase()) {
        relatedModelColumn = populateModelColumn as ColumnCollectionMetadata;
        break;
      }
    }

    if (!relatedModelColumn) {
      throw new Error(`Unable to find property on related model for multi-map collection: ${column.through}. From ${column.target}#${populate.propertyName}`);
    }

    const mapRecords = await throughRepository.find({
      select: [column.via, relatedModelColumn.via],
      where: {
        [column.via]: entityIds,
      } as WhereQuery<T>,
    });
    const populateIds = new Set<PrimaryId>();
    const populateIdsByEntityId: Record<PrimaryId, PrimaryId[]> = {};
    for (const mapRecord of mapRecords) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const entityId = mapRecord[column.via];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const populatedId = mapRecord[relatedModelColumn.via];
      populateIds.add(populatedId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!populateIdsByEntityId[entityId]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        populateIdsByEntityId[entityId] = [];
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      populateIdsByEntityId[entityId].push(populatedId);
    }

    const populateWhere = _.merge(
      {
        [populateModelPrimaryKeyPropertyName]: Array.from(populateIds),
      },
      populate.where,
    );

    const populateResults = await populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      skip: populate.skip,
      limit: populate.limit,
    } as FindArgs<Entity>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const populateResultsById = _.keyBy(populateResults, populateModelPrimaryKeyPropertyName) as Record<PrimaryId, Entity>;

    for (const entity of entities) {
      const populatedItems = [];
      const entityId = entity[primaryKeyPropertyName] as unknown as PrimaryId;
      const populateIdsForEntity = populateIdsByEntityId[entityId] || [];
      for (const id of populateIdsForEntity) {
        const populatedItem = populateResultsById[id];
        if (populatedItem) {
          populatedItems.push(populatedItem);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entity[populate.propertyName as string & keyof QueryResult<T>] as any) = populatedItems;
    }
  }
}
