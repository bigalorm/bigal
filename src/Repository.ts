import type { IRepository } from './IRepository.js';
import type { CreateOptions } from './query/CreateOptions.js';
import type {
  CreateResult,
  CreateResultArray,
  CreateUpdateOptions,
  DeleteOptions,
  DestroyResult,
  DestroyResultWithRecords,
  DoNotReturnRecords,
  ReturnSelect,
  UpdateResult,
  WhereQuery,
} from './query/index.js';
import type { OnConflictOptions } from './query/OnConflictOptions.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { getDeleteQueryAndParams, getInsertQueryAndParams, getUpdateQueryAndParams } from './SqlHelper.js';
import type { CreateUpdateParams, OmitEntityCollections, OmitFunctions, QueryResult } from './types/index.js';

type AnyRecord = Record<string, unknown>;

export class Repository<T extends AnyRecord> extends ReadonlyRepository<T> implements IRepository<T> {
  /**
   * Creates an object using the specified values
   * @param {object} values - Values to insert as multiple new objects.
   * @param {object} [options]
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object}
   */
  public create(values: CreateUpdateParams<T>, options?: OnConflictOptions<T> | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): CreateResult<T>;

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
  public create(values: CreateUpdateParams<T>[], options?: (OnConflictOptions<T> & Partial<ReturnSelect<T>>) | (Partial<OnConflictOptions<T>> & ReturnSelect<T>)): CreateResultArray<T>;

  /**
   * Creates an object using the specified values
   * @param {object|object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @param {object} [options.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
   * @returns {object|object[]|void} Return value from the db
   */
  public create(values: CreateUpdateParams<T> | CreateUpdateParams<T>[], options?: CreateOptions<T>): CreateResult<T> | CreateResultArray<T> | Promise<void> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;
    const isArray = Array.isArray(values);

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

    type CreateResultType = CreateResult<T> | CreateResultArray<T>;
    const result = {
      toSQL(): { params: readonly unknown[]; sql: string } {
        const { query, params } = getInsertQueryAndParams({
          repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
          model: modelInstance.model,
          values: values as CreateUpdateParams<T>,
          returnRecords,
          returnSelect,
        });

        return { sql: query, params };
      },
      async then<TResult = QueryResult<T> | QueryResult<T>[], TErrorResult = never>(
        resolve?: ((value: QueryResult<T> | QueryResult<T>[] | void) => PromiseLike<TResult> | TResult) | null,
        reject?: ((error: Error) => PromiseLike<TErrorResult> | TErrorResult) | null,
      ): Promise<TErrorResult | TResult> {
        try {
          if (isArray && !(values as CreateUpdateParams<T>[]).length) {
            return resolve ? await resolve([]) : ([] as unknown as TResult);
          }

          const beforeCreate = modelInstance._beforeCreate;
          if (beforeCreate) {
            if (isArray) {
              values = await Promise.all((values as CreateUpdateParams<T>[]).map(async (value) => beforeCreate(value as Partial<T>) as CreateUpdateParams<T>));
            } else {
              values = (await beforeCreate(values as Partial<T>)) as CreateUpdateParams<T>;
            }
          }

          const { query, params } = getInsertQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            values,
            returnRecords,
            returnSelect,
            onConflict: options?.onConflict,
          });

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const results = await modelInstance._pool.query<Partial<QueryResult<T>>>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance.model.tableName, operation: 'create' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

          if (returnRecords) {
            if (isArray) {
              const entities = modelInstance._buildPlainObjects(results.rows);

              if (modelInstance._afterCreate) {
                await Promise.all(
                  entities.map((entity) =>
                    Promise.resolve(modelInstance._afterCreate!(entity as T)).catch(() => {
                      /* side-effect only */
                    }),
                  ),
                );
              }

              return resolve ? await resolve(entities) : (entities as unknown as TResult);
            }

            const firstResult = results.rows[0];
            if (firstResult) {
              const entity = modelInstance._buildPlainObject(firstResult);

              if (modelInstance._afterCreate) {
                try {
                  await modelInstance._afterCreate(entity as T);
                } catch {
                  /* side-effect only */
                }
              }

              return resolve ? await resolve(entity) : (entity as unknown as TResult);
            }

            throw new Error('Unknown error getting created rows back from the database');
          }

          if (modelInstance._afterCreate) {
            try {
              await modelInstance._afterCreate({} as T);
            } catch {
              /* side-effect only */
            }
          }

          return resolve ? await resolve(undefined) : (undefined as unknown as TResult);
        } catch (ex) {
          if (reject) {
            return reject(ex as Error);
          }

          throw ex;
        }
      },
    };

    return result as unknown as CreateResultType | Promise<void>;
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
  public update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: ReturnSelect<T>): UpdateResult<T>;

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {object} where - Object representing the where query
   * @param {object} values - Values to update
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} Return values from the db or `true` if returnRecords=false
   */
  public update(where: WhereQuery<T>, values: CreateUpdateParams<T>, options?: CreateUpdateOptions<T>): Promise<void> | UpdateResult<T> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    if (typeof where === 'string') {
      throw new Error('The query cannot be a string, it must be an object');
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;

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

    const result = {
      toSQL(): { params: readonly unknown[]; sql: string } {
        const { query, params } = getUpdateQueryAndParams({
          repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
          model: modelInstance.model,
          where,
          values: values as CreateUpdateParams<T>,
          returnRecords,
          returnSelect,
        });

        return { sql: query, params };
      },
      async then<TResult = QueryResult<T>[], TErrorResult = never>(
        resolve?: ((value: QueryResult<T>[] | void) => PromiseLike<TResult> | TResult) | null,
        reject?: ((error: Error) => PromiseLike<TErrorResult> | TErrorResult) | null,
      ): Promise<TErrorResult | TResult> {
        try {
          if (modelInstance._beforeUpdate) {
            values = (await modelInstance._beforeUpdate(values as Partial<T>)) as CreateUpdateParams<T>;
          }

          const { query, params } = getUpdateQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            where,
            values,
            returnRecords,
            returnSelect,
          });

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const results = await modelInstance._pool.query<Partial<QueryResult<T>>>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance.model.tableName, operation: 'update' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

          if (returnRecords) {
            const entities = modelInstance._buildPlainObjects(results.rows);

            if (modelInstance._afterUpdate) {
              await Promise.all(
                entities.map((entity) =>
                  Promise.resolve(modelInstance._afterUpdate!(entity as T)).catch(() => {
                    /* side-effect only */
                  }),
                ),
              );
            }

            return resolve ? await resolve(entities) : (entities as unknown as TResult);
          }

          if (modelInstance._afterUpdate) {
            try {
              await modelInstance._afterUpdate({} as T);
            } catch {
              /* side-effect only */
            }
          }

          return resolve ? await resolve(undefined) : (undefined as unknown as TResult);
        } catch (ex) {
          if (reject) {
            return reject(ex as Error);
          }

          throw ex;
        }
      },
    };

    return result as unknown as Promise<void> | UpdateResult<T>;
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
  public destroy(where: WhereQuery<T>, options: DeleteOptions<T>): DestroyResultWithRecords<T>;

  /**
   * Destroys object(s) matching the where query
   * @param {object} where - Object representing the where query
   * @param {object} [options]
   * @param {boolean} [options.returnRecords] - Determines if inserted records should be returned
   * @param {string[]} [options.returnSelect] - Array of model property names to return from the query.
   * @returns {object[]|void} `void` or records affected if returnRecords=true
   */
  public destroy(where: WhereQuery<T> = {}, options?: DeleteOptions<T>): DestroyResult<T, void> | DestroyResultWithRecords<T> {
    if (this.model.readonly) {
      throw new Error(`${this.model.name} is readonly.`);
    }

    const { stack } = new Error(`${this.model.name}.destroy()`);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modelInstance = this;
    const returnSelect = options?.returnSelect;
    const returnRecords = options?.returnRecords ?? !!returnSelect;

    type DestroyResultType = DestroyResult<T, void> | DestroyResultWithRecords<T>;
    const result = {
      where(value: WhereQuery<T>): DestroyResultType {
        where = value;

        return result as unknown as DestroyResultType;
      },
      toSQL(): { params: readonly unknown[]; sql: string } {
        const { query, params } = getDeleteQueryAndParams({
          repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
          model: modelInstance.model,
          where,
          returnRecords,
          returnSelect,
        });

        return { sql: query, params };
      },
      async then<TResult = QueryResult<T>[], TErrorResult = void>(
        resolve: (result: QueryResult<T>[] | void) => PromiseLike<TResult> | TResult,
        reject: (error: Error) => PromiseLike<TErrorResult> | TErrorResult,
      ): Promise<TErrorResult | TResult> {
        if (typeof where === 'string') {
          return reject(new Error('The query cannot be a string, it must be an object'));
        }

        try {
          // beforeDestroy can modify the where clause or throw to abort
          let resolvedWhere = where;
          if (modelInstance._beforeDestroy) {
            resolvedWhere = (await modelInstance._beforeDestroy(where as Record<string, unknown>)) as WhereQuery<T>;
          }

          const { query, params } = getDeleteQueryAndParams({
            repositoriesByModelNameLowered: modelInstance._repositoriesByModelNameLowered,
            model: modelInstance.model,
            where: resolvedWhere,
            returnRecords,
            returnSelect,
          });

          const onQuery = modelInstance._onQuery;
          let startTime: number | undefined;
          if (onQuery) {
            startTime = performance.now();
          }

          const queryResult = await modelInstance._pool.query<Partial<QueryResult<T>>>(query, params);

          if (onQuery) {
            try {
              onQuery({ sql: query, params, duration: performance.now() - startTime!, model: modelInstance.model.tableName, operation: 'destroy' });
            } catch {
              // Swallow -- observability must not crash queries
            }
          }

          if (modelInstance._afterDestroy) {
            try {
              await modelInstance._afterDestroy({ rowCount: queryResult.rowCount ?? 0 });
            } catch {
              /* side-effect only */
            }
          }

          if (returnRecords) {
            const entities = modelInstance._buildPlainObjects(queryResult.rows);
            return await resolve(entities);
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

    return result as DestroyResult<T, void> | DestroyResultWithRecords<T>;
  }
}
