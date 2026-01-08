import type { Entity, EntityFieldValue, EntityStatic } from './Entity.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import type { ColumnCollectionMetadata, ColumnModelMetadata, ColumnTypeMetadata, ModelMetadata } from './metadata/index.js';
import type { CountArgs } from './query/CountArgs.js';
import type {
  CountResult,
  FindArgs,
  FindOneArgs,
  FindOneResult,
  FindQueryWithCount,
  FindResult,
  FindWithCountResult,
  JoinDefinition,
  OrderBy,
  PaginateOptions,
  PopulateArgs,
  Sort,
  SortObject,
  SortObjectValue,
  WhereQuery,
} from './query/index.js';
import { getCountQueryAndParams, getSelectQueryAndParams } from './SqlHelper.js';
import type { GetValueType, OmitEntityCollections, OmitFunctions, PickAsType, PickByValueType, PickFunctions, PoolLike, Populated, QueryResult } from './types/index.js';
import { groupBy, keyBy } from './utils/index.js';

export interface IRepositoryOptions<T extends Entity> {
  modelMetadata: ModelMetadata<T>;
  type: EntityStatic<T>;
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  pool: PoolLike;
  readonlyPool?: PoolLike;
}

interface Populate {
  propertyName: string;
  where?: WhereQuery<Entity>;
  select?: string[];
  sort?: SortObject<Entity> | string;
  skip?: number;
  limit?: number;
  pool?: PoolLike;
}

type PrimaryId = number | string;

export class ReadonlyRepository<T extends Entity> implements IReadonlyRepository<T> {
  private readonly _modelMetadata: ModelMetadata<T>;

  protected _type: EntityStatic<T>;

  protected _pool: PoolLike;

  protected _readonlyPool: PoolLike;

  protected _repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;

  protected _floatProperties: string[] = [];

  protected _intProperties: string[] = [];

  public constructor({ modelMetadata, type, pool, readonlyPool, repositoriesByModelNameLowered }: IRepositoryOptions<T>) {
    this._modelMetadata = modelMetadata;
    this._type = type;
    this._pool = pool;
    this._readonlyPool = readonlyPool ?? pool;
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
   * @returns Database record or null
   */
  public findOne<K extends string & keyof T, TReturn = QueryResult<Pick<T, K | keyof PickFunctions<T> | 'id'>>>(args: FindOneArgs<T, K> | WhereQuery<T> = {}): FindOneResult<T, TReturn> {
    const { stack } = new Error(`${this.model.name}.findOne()`);

    let select: Set<string> | undefined;
    let where: WhereQuery<T> = {};
    let sort: SortObject<T> | string | null = null;
    let poolOverride: PoolLike | undefined;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          if (value) {
            select = new Set(value as string[]);
          }

          break;
        case 'where':
          where = value as WhereQuery<T>;
          break;
        case 'sort':
          sort = value as SortObject<T> | string;
          break;
        case 'pool':
          poolOverride = value as PoolLike;
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
    const joins: JoinDefinition[] = [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Columns to select from the entity
       * @param {string[]} keys - Columns to select from the entity
       * @returns Query instance
       */
      select<TKeys extends string & keyof T>(keys: TKeys[]): FindOneResult<T, Pick<T, TKeys>> {
        select = new Set(keys);
        // TypeScript cast for chaining - this is safe as per FindResult generic contract
        return this as unknown as FindOneResult<T, Pick<T, TKeys>>;
      },
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       * @returns Query instance
       */
      where(value: WhereQuery<T>): FindOneResult<T, TReturn> {
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
       * @returns Query instance
       */
      populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends keyof TPopulateType>(
        propertyName: TProperty,
        options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
      ): FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>> {
        // Add the column if the property is a single relation and not included in the list of select columns
        if (select && !select.has(propertyName)) {
          for (const column of modelInstance.model.columns) {
            if ((column as ColumnModelMetadata).model && column.propertyName === propertyName) {
              select.add(column.propertyName);
            }
          }
        }

        populates.push({
          propertyName,
          where: options?.where,
          select: options?.select,
          sort: options?.sort,
          skip: options?.skip,
          limit: options?.limit,
          pool: options?.pool ?? poolOverride,
        });

        return this as FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>>;
      },
      join(propertyName: string, alias?: string): FindOneResult<T, TReturn> {
        joins.push({
          propertyName,
          alias: alias ?? propertyName,
          type: 'inner',
        });

        return this;
      },
      leftJoin(propertyName: string, alias?: string, on?: WhereQuery<Entity>): FindOneResult<T, TReturn> {
        joins.push({
          propertyName,
          alias: alias ?? propertyName,
          type: 'left',
          on,
        });

        return this;
      },
      /**
       * Sorts the query
       * @param {string|object} [value]
       * @returns Query instance
       */
      sort(value?: Sort<T>): FindOneResult<T, TReturn> {
        if (value) {
          sorts.push(...modelInstance._convertSortsToOrderBy(value));
        }

        return this;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(_propertyName: TProperty): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>> {
        return this as FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>>;
      },
      UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
        propertyName: TProperty,
        value: TValue,
      ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>> {
        manuallySetFields.push({
          propertyName,
          value,
        });

        return this as FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>>;
      },
      async then<TResult = TReturn | null, TErrorResult = void>(
        resolve: (result: TReturn | null) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        try {
          if (typeof where === 'string') {
            return await reject(new Error('The query cannot be a string, it must be an object'));
          }

          const { query, params } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
            where,
            sorts,
            limit: 1,
            skip: 0,
            joins,
          });

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const results = await pool.query<Partial<QueryResult<T>>>(query, params);
          const firstResult = results.rows[0];
          if (firstResult) {
            const result = modelInstance._buildInstance(firstResult);

            if (populates.length) {
              await modelInstance.populateFields([result], populates);
            }

            for (const manuallySetField of manuallySetFields) {
              // @ts-expect-error - Ignoring unknown is not a key
              result[manuallySetField.propertyName as string & keyof T] = manuallySetField.value;
            }

            return await resolve(result as unknown as TReturn);
          }

          return await resolve(null);
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += `\n${stack ?? ''}`;
          } else {
            typedException.stack = stack;
          }

          return reject(typedException);
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
   * @returns Database records
   */
  public find<K extends string & keyof T, TReturn = QueryResult<Pick<T, K | keyof PickFunctions<T> | 'id'>>>(args: FindArgs<T, K> | WhereQuery<T> = {}): FindResult<T, TReturn> {
    const { stack } = new Error(`${this.model.name}.find()`);

    let select: Set<string> | undefined;
    let where: WhereQuery<T> = {};
    let sort: SortObject<T> | string | null = null;
    let skip: number | null = null;
    let limit: number | null = null;
    let poolOverride: PoolLike | undefined;
    // Args can be a FindArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'select':
          if (value) {
            select = new Set(value as string[]);
          }

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
        case 'pool':
          poolOverride = value as PoolLike;
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
    const joins: JoinDefinition[] = [];
    let includeCount = false;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Columns to select from the entity
       * @param {string[]} keys - Columns to select from the entity
       * @returns Query instance
       */
      select<TKeys extends string & keyof T>(keys: TKeys[]): FindResult<T, Pick<T, TKeys>> {
        select = new Set(keys);
        // TypeScript cast for chaining - this is safe as per FindResult generic contract
        return this as unknown as FindResult<T, Pick<T, TKeys>>;
      },
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       * @returns Query instance
       */
      where(value: WhereQuery<T>): FindResult<T, TReturn> {
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
       * @returns Query instance
       */
      populate<
        TProperty extends string & keyof PickByValueType<T, Entity> & keyof T,
        TPopulateType extends GetValueType<T[TProperty], Entity>,
        TPopulateSelectKeys extends string & keyof TPopulateType,
      >(propertyName: TProperty, options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>): FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>> {
        // Add the column if the property is a single relation and not included in the list of select columns
        if (select && !select.has(propertyName)) {
          for (const column of modelInstance.model.columns) {
            if ((column as ColumnModelMetadata).model && column.propertyName === propertyName) {
              select.add(column.propertyName);
            }
          }
        }

        populates.push({
          propertyName,
          where: options?.where,
          select: options?.select,
          sort: options?.sort,
          skip: options?.skip,
          limit: options?.limit,
          pool: options?.pool ?? poolOverride,
        });

        return this as unknown as FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>>;
      },
      join(propertyName: string, alias?: string): FindResult<T, TReturn> {
        joins.push({
          propertyName,
          alias: alias ?? propertyName,
          type: 'inner',
        });

        return this;
      },
      leftJoin(propertyName: string, alias?: string, on?: WhereQuery<Entity>): FindResult<T, TReturn> {
        joins.push({
          propertyName,
          alias: alias ?? propertyName,
          type: 'left',
          on,
        });

        return this;
      },
      /**
       * Sorts the query
       * @param {string|string[]|object} [value]
       * @returns Query instance
       */
      sort(value?: Sort<T>): FindResult<T, TReturn> {
        if (value) {
          sorts.push(...modelInstance._convertSortsToOrderBy(value));
        }

        return this;
      },
      /**
       * Limits results returned by the query
       * @param {number} value
       * @returns Query instance
       */
      limit(value: number): FindResult<T, TReturn> {
        limit = value;

        return this;
      },
      /**
       * Skips records returned by the query
       * @param {number} value
       * @returns Query instance
       */
      skip(value: number): FindResult<T, TReturn> {
        skip = value;

        return this;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(_propertyName: TProperty): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>> {
        return this as unknown as FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>>;
      },
      /**
       * Pages records returned by the query
       * @param {number} [page] - Page to return - Starts at 1
       * @param {number} [limit] - Number of records to return
       * @returns Query instance
       */
      paginate({ page, limit: paginateLimit }: PaginateOptions): FindResult<T, TReturn> {
        const safePage = Math.max(page, 1);
        return this.skip(safePage * paginateLimit - paginateLimit).limit(paginateLimit);
      },
      withCount(): FindQueryWithCount<T, TReturn> {
        includeCount = true;
        return this as unknown as FindQueryWithCount<T, TReturn>;
      },
      async then<TResult = TReturn[], TErrorResult = void>(
        resolve: (result: TReturn[]) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        try {
          if (typeof where === 'string') {
            return await reject(new Error('The query cannot be a string, it must be an object'));
          }

          const { query, params } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
            where,
            sorts,
            skip: skip ?? 0,
            limit: limit ?? 0,
            joins,
            includeCount,
          });

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const results = await pool.query<Partial<QueryResult<T>> & { __total_count__?: string }>(query, params);

          let totalCount = 0;
          if (includeCount && results.rows.length > 0 && results.rows[0]?.__total_count__ !== undefined) {
            totalCount = Number(results.rows[0].__total_count__);
          }

          const rows = includeCount
            ? results.rows.map((row) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { __total_count__, ...rest } = row;
                return rest as Partial<QueryResult<T>>;
              })
            : results.rows;

          const entities = modelInstance._buildInstances(rows);

          if (populates.length) {
            await modelInstance.populateFields(entities, populates);
          }

          if (includeCount) {
            return await (resolve as unknown as (result: FindWithCountResult<TReturn>) => PromiseLike<TResult> | TResult)({
              results: entities as unknown as TReturn[],
              totalCount,
            });
          }

          return await resolve(entities as unknown as TReturn[]);
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += `\n${stack ?? ''}`;
          } else {
            typedException.stack = stack;
          }

          return reject(typedException);
        }
      },
    };
  }

  /**
   * Gets a count of rows matching the where query
   * @param {object} [args] - Arguments
   * @param {object} [args.where] - Object representing the where query
   * @param {object} [args.pool] - Override the db pool to use for the query
   * @returns {number} Number of records matching the where criteria
   */
  public count(args: CountArgs<T> | WhereQuery<T> = {}): CountResult<T> {
    const { stack } = new Error(`${this.model.name}.count()`);

    let where: WhereQuery<T> = {};
    let poolOverride: PoolLike | undefined;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, or sort, treat it as a query object
    for (const [name, value] of Object.entries(args)) {
      let isWhereCriteria = false;

      switch (name) {
        case 'where':
          where = value as WhereQuery<T>;
          break;
        case 'pool':
          poolOverride = value as PoolLike;
          break;
        default:
          where = args as WhereQuery<T>;
          isWhereCriteria = true;
          break;
      }

      if (isWhereCriteria) {
        break;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

    return {
      /**
       * Filters the query
       * @param {object} value - Object representing the where query
       * @returns Count result
       */
      where(value: WhereQuery<T>): CountResult<T> | number {
        where = value;

        return this;
      },
      async then<TResult = number, TErrorResult = void>(
        resolve: (result: number) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        try {
          const { query, params } = getCountQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            where,
          });

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const result = await pool.query<{ count: string }>(query, params);

          const firstResult = result.rows[0];
          const originalValue = firstResult ? firstResult.count : 0;
          return await resolve(Number(originalValue));
        } catch (ex) {
          const typedException = ex as Error;
          if (typedException.stack) {
            typedException.stack += `\n${stack ?? ''}`;
          } else {
            typedException.stack = stack;
          }

          return reject(typedException);
        }
      },
    };
  }

  protected _buildInstance(row: Partial<QueryResult<T>>): QueryResult<T> {
    const instance = new this._type();
    Object.assign(instance, row);

    // NOTE: Number fields may be strings coming from the db. In those cases, try to convert the value to Number
    for (const name of this._floatProperties) {
      const originalValue = row[name as keyof QueryResult<T>] as number | string | null | undefined;
      if (originalValue != null && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (Number.isFinite(value) && value.toString() === originalValue) {
            // @ts-expect-error - string cannot be used to index type T
            instance[name] = value;
          }
        } catch {
          // Ignore and leave value as original
        }
      }
    }

    for (const name of this._intProperties) {
      const originalValue = row[name as keyof QueryResult<T>] as number | string | null | undefined;
      if (originalValue != null && typeof originalValue === 'string') {
        try {
          const value = Number(originalValue);
          if (Number.isFinite(value) && value.toString() === originalValue) {
            const valueAsInt = Math.trunc(value);
            if (Number.isSafeInteger(valueAsInt)) {
              // @ts-expect-error - string cannot be used to index type T
              instance[name] = valueAsInt;
            }
          }
        } catch {
          // Ignore and leave value as original
        }
      }
    }

    return instance as unknown as QueryResult<T>;
  }

  protected _buildInstances(rows: Partial<QueryResult<T>>[]): QueryResult<T>[] {
    return rows.map((row: Partial<QueryResult<T>>) => this._buildInstance(row));
  }

  protected _convertSortsToOrderBy(sorts: SortObject<T> | string): OrderBy<T>[] {
    const result: OrderBy<T>[] = [];
    if (sorts) {
      if (Array.isArray(sorts)) {
        for (const sort of sorts as string[]) {
          const parts = sort.trim().split(' ');
          const propertyName = parts.shift() as string & keyof OmitFunctions<OmitEntityCollections<T>>;
          result.push({
            propertyName,
            descending: /desc/i.test(parts.join('')),
          });
        }
      } else if (typeof sorts === 'string') {
        for (const sort of sorts.split(',')) {
          const parts = sort.trim().split(' ');
          const propertyName = parts.shift() as string & keyof OmitFunctions<OmitEntityCollections<T>>;
          result.push({
            propertyName,
            descending: /desc/i.test(parts.join('')),
          });
        }
      } else if (typeof sorts === 'object') {
        for (const [propertyName, orderValue] of Object.entries(sorts)) {
          let descending = false;
          const order = orderValue as SortObjectValue;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (order && (order === -1 || /desc/i.test(`${order}`))) {
            descending = true;
          }

          result.push({
            propertyName: propertyName as string & keyof OmitFunctions<OmitEntityCollections<T>>,
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
          if (id == null) {
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
      pool: populate.pool,
    } as FindArgs<Entity>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const populateResultsById = keyBy(populateResults, populateRepository.model.primaryKeyColumn.propertyName) as Record<number | string, any>;

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
      pool: populate.pool,
    } as FindArgs<Entity>);

    if (entities.length === 1) {
      for (const entity of entities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entity[populate.propertyName as string & keyof QueryResult<T>] as any) = populateResults;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const populateResultsByEntityId = groupBy(populateResults, column.via) as Record<PrimaryId, any>;
      for (const entity of entities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
        const id = entity[primaryKeyPropertyName] as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/prefer-nullish-coalescing
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      pool: populate.pool,
    });
    const populateIds = new Set<PrimaryId>();
    const populateIdsByEntityId: Record<PrimaryId, PrimaryId[]> = {};
    for (const mapRecord of mapRecords) {
      const entityId = mapRecord[column.via] as PrimaryId;
      const populatedId = mapRecord[relatedModelColumn.via] as PrimaryId;
      populateIds.add(populatedId);
      const entityPopulateIds = populateIdsByEntityId[entityId] ?? [];
      entityPopulateIds.push(populatedId);

      populateIdsByEntityId[entityId] = entityPopulateIds;
    }

    const populateWhere = {
      [populateModelPrimaryKeyPropertyName]: Array.from(populateIds),
      ...populate.where,
    };

    const populateResults = await populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      skip: populate.skip,
      limit: populate.limit,
      pool: populate.pool,
    } as FindArgs<Entity>);

    const populateResultsById = keyBy(populateResults, populateModelPrimaryKeyPropertyName as string) as Record<PrimaryId, Entity>;

    for (const entity of entities) {
      const populatedItems = [];
      const entityId = entity[primaryKeyPropertyName] as unknown as PrimaryId;
      const populateIdsForEntity = populateIdsByEntityId[entityId] ?? [];
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
