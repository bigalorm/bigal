import type { OnQueryCallback } from './initialize.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import type { ColumnCollectionMetadata, ColumnModelMetadata, ColumnTypeMetadata, ModelMetadata } from './metadata/index.js';
import type { CountArgs } from './query/CountArgs.js';
import type {
  CountResult,
  FindArgs,
  FindOneArgs,
  FindOneResult,
  FindOneResultJSON,
  FindQueryWithCount,
  FindResult,
  FindResultJSON,
  FindWithCountResult,
  JoinDefinition,
  OrderBy,
  PaginateOptions,
  PopulateArgs,
  Sort,
  SortObject,
  SortObjectValue,
  SubqueryBuilderLike,
  SubqueryJoinOnCondition,
  WhereQuery,
} from './query/index.js';
import { getCountQueryAndParams, getSelectQueryAndParams } from './SqlHelper.js';
import type { GetValueType, OmitEntityCollections, OmitFunctions, PickAsType, PickByValueType, PickFunctions, PoolLike, Populated, QueryResult } from './types/index.js';
import { groupBy, keyBy } from './utils/index.js';

type FieldValue = boolean[] | Date | number[] | Record<string, unknown> | string[] | boolean | number | string | unknown | null;

type AnyRecord = Record<string, unknown>;

export interface IRepositoryOptions<T extends AnyRecord> {
  modelMetadata: ModelMetadata<T>;
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>>;
  pool: PoolLike;
  readonlyPool?: PoolLike;
  onQuery?: OnQueryCallback;
  afterFind?: (results: T[]) => Promise<T[]> | T[];
  beforeCreate?: (values: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  afterCreate?: (result: T) => Promise<void> | void;
  beforeUpdate?: (values: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  afterUpdate?: (result: T) => Promise<void> | void;
  beforeDestroy?: (where: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterDestroy?: (result: { rowCount: number }) => Promise<void> | void;
  filters?: Record<string, (() => Record<string, unknown>) | Record<string, unknown>>;
}

interface Populate {
  propertyName: string;
  where?: WhereQuery<AnyRecord>;
  select?: string[];
  sort?: SortObject<AnyRecord> | string;
  skip?: number;
  limit?: number;
  pool?: PoolLike;
  asPlainObjects?: boolean;
  through?: {
    where?: Record<string, unknown>;
    sort?: SortObject<AnyRecord> | string;
  };
}

type PrimaryId = number | string;

export class ReadonlyRepository<T extends AnyRecord> implements IReadonlyRepository<T> {
  private readonly _modelMetadata: ModelMetadata<T>;

  protected _pool: PoolLike;

  protected _readonlyPool: PoolLike;

  protected _repositoriesByModelNameLowered: Record<string, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>>;

  protected _onQuery: OnQueryCallback | undefined;

  protected _afterFind: ((results: T[]) => Promise<T[]> | T[]) | undefined;

  protected _beforeCreate: ((values: Partial<T>) => Partial<T> | Promise<Partial<T>>) | undefined;

  protected _afterCreate: ((result: T) => Promise<void> | void) | undefined;

  protected _beforeUpdate: ((values: Partial<T>) => Partial<T> | Promise<Partial<T>>) | undefined;

  protected _afterUpdate: ((result: T) => Promise<void> | void) | undefined;

  protected _beforeDestroy: ((where: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>) | undefined;

  protected _afterDestroy: ((result: { rowCount: number }) => Promise<void> | void) | undefined;

  protected _filters: Record<string, (() => Record<string, unknown>) | Record<string, unknown>> | undefined;

  protected _floatProperties: string[] = [];

  protected _intProperties: string[] = [];

  public constructor({
    modelMetadata,
    pool,
    readonlyPool,
    repositoriesByModelNameLowered,
    onQuery,
    afterFind,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
    beforeDestroy,
    afterDestroy,
    filters,
  }: IRepositoryOptions<T>) {
    this._modelMetadata = modelMetadata;
    this._pool = pool;
    this._readonlyPool = readonlyPool ?? pool;
    this._repositoriesByModelNameLowered = repositoriesByModelNameLowered;
    this._onQuery = onQuery;
    this._afterFind = afterFind;
    this._beforeCreate = beforeCreate;
    this._afterCreate = afterCreate;
    this._beforeUpdate = beforeUpdate;
    this._afterUpdate = afterUpdate;
    this._beforeDestroy = beforeDestroy;
    this._afterDestroy = afterDestroy;
    this._filters = filters;

    for (const column of modelMetadata.columns) {
      if ((column as ColumnTypeMetadata).type === 'float') {
        this._floatProperties.push(column.propertyName);
      } else if ((column as ColumnTypeMetadata).type === 'integer') {
        this._intProperties.push(column.propertyName);
      }
    }
  }

  /**
   * Resolves global filters and merges with the where clause.
   * Filters are applied first; the where clause can override filter keys.
   * @param {Record<string, unknown>} where - The user's where clause
   * @param {boolean | Record<string, false>} [filterOverrides] - false to disable all, or { filterName: false } to disable specific ones
   */
  protected _applyFilters(where: Record<string, unknown>, filterOverrides?: Record<string, false> | false): Record<string, unknown> {
    if (!this._filters || filterOverrides === false) {
      return where;
    }

    let resolved: Record<string, unknown> = {};
    for (const [filterName, filterDef] of Object.entries(this._filters)) {
      if (filterOverrides && filterOverrides[filterName] === false) {
        continue;
      }

      const filterWhere = typeof filterDef === 'function' ? filterDef() : filterDef;
      resolved = { ...resolved, ...filterWhere };
    }

    // Where clause overrides filter values for the same keys
    return { ...resolved, ...where };
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
    let filterOverrides: Record<string, false> | false | undefined;
    // Args can be a FindOneArgs type or a query object. If args has a key other than select, where, sort, or filters, treat it as a query object
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
        case 'filters':
          filterOverrides = value as Record<string, false> | false;
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
    let returnAsPlainObjects = false;

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
      filters(value: Record<string, false> | false): FindOneResult<T, TReturn> {
        filterOverrides = value;

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
      populate<TProperty extends string & keyof PickByValueType<T, AnyRecord> & keyof T, TPopulateType extends GetValueType<T[TProperty], AnyRecord>, TPopulateSelectKeys extends keyof TPopulateType>(
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
          through: options?.through,
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
      leftJoin(propertyName: string, alias?: string, on?: WhereQuery<AnyRecord>): FindOneResult<T, TReturn> {
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
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, AnyRecord> & keyof T>(
        _propertyName: TProperty,
      ): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>> {
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
      toJSON(): FindOneResultJSON<T, TReturn> {
        returnAsPlainObjects = true;
        return this as unknown as FindOneResultJSON<T, TReturn>;
      },
      toSQL(): { params: readonly unknown[]; sql: string } {
        const filteredWhere = modelInstance._applyFilters(where as Record<string, unknown>, filterOverrides) as WhereQuery<T>;
        const result = getSelectQueryAndParams({
          repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
          model: modelInstance.model,
          select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
          where: filteredWhere,
          sorts,
          skip: 0,
          limit: 1,
        });

        return { sql: result.query, params: result.params };
      },
      async then<TResult = TReturn | null, TErrorResult = void>(
        resolve: (result: TReturn | null) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        try {
          if (typeof where === 'string') {
            return await reject(new Error('The query cannot be a string, it must be an object'));
          }

          const filteredWhere = modelInstance._applyFilters(where as Record<string, unknown>, filterOverrides) as WhereQuery<T>;

          const { query, params } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
            where: filteredWhere,
            sorts,
            limit: 1,
            skip: 0,
            joins,
          });

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const results = await pool.query<Partial<QueryResult<T>>>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance._modelMetadata.tableName, operation: 'findOne' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

          const firstResult = results.rows[0];
          if (firstResult) {
            void returnAsPlainObjects; // Always plain objects now
            const result = modelInstance._buildPlainObject(firstResult);

            if (populates.length) {
              const populatesWithFlag = populates.map((pop) => ({ ...pop, asPlainObjects: true }));
              await modelInstance.populateFields([result], populatesWithFlag);
            }

            for (const manuallySetField of manuallySetFields) {
              // @ts-expect-error - Ignoring unknown is not a key
              result[manuallySetField.propertyName as string & keyof T] = manuallySetField.value;
            }

            const finalResult = modelInstance._afterFind ? ((await modelInstance._afterFind([result as T]))[0] ?? result) : result;

            return await resolve(finalResult as unknown as TReturn);
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
    let filterOverrides: Record<string, false> | false | undefined;
    // Args can be a FindArgs type or a query object. If args has a key other than select, where, sort, or filters, treat it as a query object
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
        case 'filters':
          filterOverrides = value as Record<string, false> | false;
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
    let returnAsPlainObjects = false;
    let distinctOnColumns: string[] | undefined;

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
      filters(value: Record<string, false> | false): FindResult<T, TReturn> {
        filterOverrides = value;

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
        TProperty extends string & keyof PickByValueType<T, AnyRecord> & keyof T,
        TPopulateType extends GetValueType<T[TProperty], AnyRecord>,
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
          through: options?.through,
        });

        return this as unknown as FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>>;
      },
      join(propertyNameOrSubquery: SubqueryBuilderLike | string, aliasOrUndefined?: string, options?: { on: SubqueryJoinOnCondition }): FindResult<T, TReturn> {
        if (typeof propertyNameOrSubquery === 'string') {
          joins.push({
            propertyName: propertyNameOrSubquery,
            alias: aliasOrUndefined ?? propertyNameOrSubquery,
            type: 'inner',
          });
        } else {
          if (!aliasOrUndefined) {
            throw new Error('Alias is required when joining to a subquery');
          }

          joins.push({
            subquery: propertyNameOrSubquery,
            alias: aliasOrUndefined,
            type: 'inner',
            on: options?.on ?? {},
          });
        }

        return this;
      },
      leftJoin(propertyNameOrSubquery: SubqueryBuilderLike | string, aliasOrUndefined?: string, onOrOptions?: WhereQuery<AnyRecord> | { on: SubqueryJoinOnCondition }): FindResult<T, TReturn> {
        if (typeof propertyNameOrSubquery === 'string') {
          joins.push({
            propertyName: propertyNameOrSubquery,
            alias: aliasOrUndefined ?? propertyNameOrSubquery,
            type: 'left',
            on: onOrOptions as WhereQuery<AnyRecord> | undefined,
          });
        } else {
          if (!aliasOrUndefined) {
            throw new Error('Alias is required when joining to a subquery');
          }

          const subqueryOptions = onOrOptions as { on: SubqueryJoinOnCondition } | undefined;
          joins.push({
            subquery: propertyNameOrSubquery,
            alias: aliasOrUndefined,
            type: 'left',
            on: subqueryOptions?.on ?? {},
          });
        }

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
      /**
       * Selects distinct rows based on the specified columns (PostgreSQL DISTINCT ON).
       * The ORDER BY clause must start with the same columns in the same order.
       * Cannot be combined with withCount().
       * @param {string[]} columns - Column names for DISTINCT ON clause
       * @returns Query instance
       */
      distinctOn(columns: (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]): FindResult<T, TReturn> {
        distinctOnColumns = columns;

        return this;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, AnyRecord> & keyof T>(_propertyName: TProperty): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>> {
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
        if (distinctOnColumns?.length) {
          throw new Error('distinctOn cannot be used with withCount due to PostgreSQL limitations');
        }

        includeCount = true;
        return this as unknown as FindQueryWithCount<T, TReturn>;
      },
      toJSON(): FindResultJSON<T, TReturn> {
        returnAsPlainObjects = true;
        return this as unknown as FindResultJSON<T, TReturn>;
      },
      toSQL(): { params: readonly unknown[]; sql: string } {
        const filteredWhere = modelInstance._applyFilters(where as Record<string, unknown>, filterOverrides) as WhereQuery<T>;
        const result = getSelectQueryAndParams({
          repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
          model: modelInstance.model,
          select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
          where: filteredWhere,
          sorts,
          skip: skip ?? 0,
          limit: limit ?? 0,
          joins,
          includeCount,
          distinctOn: distinctOnColumns,
        });

        return { sql: result.query, params: result.params };
      },
      async then<TResult = TReturn[], TErrorResult = void>(
        resolve: (result: TReturn[]) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        try {
          if (typeof where === 'string') {
            return await reject(new Error('The query cannot be a string, it must be an object'));
          }

          const filteredWhere = modelInstance._applyFilters(where as Record<string, unknown>, filterOverrides) as WhereQuery<T>;

          const { query, params } = getSelectQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            select: select ? (Array.from(select) as (string & keyof OmitFunctions<OmitEntityCollections<T>>)[]) : undefined,
            where: filteredWhere,
            sorts,
            skip: skip ?? 0,
            limit: limit ?? 0,
            joins,
            includeCount,
            distinctOn: distinctOnColumns,
          });

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const results = await pool.query<Partial<QueryResult<T>> & { __total_count__?: string }>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance._modelMetadata.tableName, operation: 'find' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

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

          void returnAsPlainObjects; // Always plain objects now
          const entities = modelInstance._buildPlainObjects(rows);

          if (populates.length) {
            const populatesWithFlag = populates.map((pop) => ({ ...pop, asPlainObjects: true }));
            await modelInstance.populateFields(entities, populatesWithFlag);
          }

          const finalEntities = modelInstance._afterFind ? await modelInstance._afterFind(entities as T[]) : entities;

          if (includeCount) {
            return await (resolve as unknown as (result: FindWithCountResult<TReturn>) => PromiseLike<TResult> | TResult)({
              results: finalEntities as unknown as TReturn[],
              totalCount,
            });
          }

          return await resolve(finalEntities as unknown as TReturn[]);
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

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const pool = poolOverride ?? modelInstance._readonlyPool;
          const result = await pool.query<{ count: string }>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance._modelMetadata.tableName, operation: 'count' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

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

  protected _buildPlainObject(row: Partial<QueryResult<T>>): QueryResult<T> {
    const plainObject = { ...row } as Record<string, unknown>;

    for (const name of this._floatProperties) {
      const originalValue = plainObject[name] as number | string | null | undefined;
      if (originalValue != null && typeof originalValue === 'string') {
        const value = Number(originalValue);
        // Skip conversion for very large numbers to avoid precision loss
        if (Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
          plainObject[name] = value;
        }
      }
    }

    for (const name of this._intProperties) {
      const originalValue = plainObject[name] as number | string | null | undefined;
      if (originalValue != null && typeof originalValue === 'string') {
        const value = Number(originalValue);
        // Integer columns keep the round-trip check to avoid converting decimal strings to truncated integers
        if (Number.isFinite(value) && value.toString() === originalValue) {
          const valueAsInt = Math.trunc(value);
          if (Number.isSafeInteger(valueAsInt)) {
            plainObject[name] = valueAsInt;
          }
        }
      }
    }

    return plainObject as QueryResult<T>;
  }

  protected _buildPlainObjects(rows: Partial<QueryResult<T>>[]): QueryResult<T>[] {
    return rows.map((row: Partial<QueryResult<T>>) => this._buildPlainObject(row));
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

        const entityIds = new Set<FieldValue>();
        for (const entity of entities) {
          const id = entity[primaryKeyColumn.propertyName as keyof QueryResult<T>] as FieldValue;
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
    const populateIds = new Set<FieldValue>();
    for (const entity of entities) {
      const populateId = entity[propertyName] as FieldValue;
      if (populateId) {
        populateIds.add(populateId);
      }
    }

    const populateWhere: WhereQuery<AnyRecord> = {
      [populateRepository.model.primaryKeyColumn.propertyName]: Array.from(populateIds),
      ...populate.where,
    };

    const findQuery = populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      pool: populate.pool,
    } as FindArgs<AnyRecord>);
    const populateResults = populate.asPlainObjects ? await findQuery.toJSON() : await findQuery;
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
    entityIds: FieldValue[],
    populate: Populate,
    column: ColumnCollectionMetadata,
    populateRepository: IReadonlyRepository<AnyRecord>,
  ): Promise<void> {
    if (entities.length > 1 && populate.select && !populate.select.includes(column.via)) {
      throw new Error(`Unable to populate "${populate.propertyName}" on ${this.model.name}. "${column.via}" is not included in select array.`);
    }

    const populateWhere = {
      [column.via]: entityIds,
      ...populate.where,
    };

    const findQuery = populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      skip: populate.skip,
      limit: populate.limit,
      pool: populate.pool,
    } as FindArgs<AnyRecord>);
    const populateResults = populate.asPlainObjects ? await findQuery.toJSON() : await findQuery;

    if (entities.length === 1) {
      for (const entity of entities) {
        (entity as Record<string, unknown>)[populate.propertyName] = populateResults;
      }
    } else {
      const populateResultsByEntityId = groupBy(populateResults, column.via) as Record<PrimaryId, AnyRecord[]>;
      for (const entity of entities) {
        const id = entity[primaryKeyPropertyName] as PrimaryId;
        (entity as Record<string, unknown>)[populate.propertyName] = populateResultsByEntityId[id] ?? [];
      }
    }
  }

  private async populateManyManyCollection(
    entities: QueryResult<T>[],
    primaryKeyPropertyName: keyof QueryResult<T>,
    entityIds: FieldValue[],
    populateModelPrimaryKeyPropertyName: keyof QueryResult<T>,
    populate: Populate,
    column: ColumnCollectionMetadata,
    populateRepository: IReadonlyRepository<AnyRecord>,
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
      if (through?.toLowerCase() === column.through.toLowerCase()) {
        relatedModelColumn = populateModelColumn as ColumnCollectionMetadata;
        break;
      }
    }

    if (!relatedModelColumn) {
      throw new Error(`Unable to find property on related model for multi-map collection: ${column.through}. From ${column.target}#${populate.propertyName}`);
    }

    // Build the through/junction table query with optional where and sort
    const throughWhere = {
      [column.via]: entityIds,
      ...populate.through?.where,
    } as WhereQuery<T>;

    const mapRecords = await throughRepository.find({
      select: [column.via, relatedModelColumn.via],
      where: throughWhere,
      sort: populate.through?.sort,
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

    // Short-circuit if no junction records matched (optimization)
    if (populateIds.size === 0) {
      for (const entity of entities) {
        (entity as Record<string, unknown>)[populate.propertyName] = [];
      }

      return;
    }

    const populateWhere = {
      [populateModelPrimaryKeyPropertyName]: Array.from(populateIds),
      ...populate.where,
    };

    const findQuery = populateRepository.find({
      select: populate.select,
      where: populateWhere,
      sort: populate.sort,
      skip: populate.skip,
      limit: populate.limit,
      pool: populate.pool,
    } as FindArgs<AnyRecord>);
    const populateResults = populate.asPlainObjects ? await findQuery.toJSON() : await findQuery;

    const populateResultsById = keyBy(populateResults, populateModelPrimaryKeyPropertyName as string) as Record<PrimaryId, AnyRecord>;

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

      (entity as Record<string, unknown>)[populate.propertyName] = populatedItems;
    }
  }
}
