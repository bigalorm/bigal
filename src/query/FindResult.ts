import type { ModelNameOf, PopulatableKeys, SchemaDefinition, SchemaEntry } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';
import type { DefaultModelsMap, GetValueType, ModelRelationshipKeys, OmitFunctions, PickByValueType, Populated, ResolveModel } from '../types/index.js';

import type { FindQueryWithCount } from './FindWithCountResult.js';
import type { SubqueryJoinOnCondition } from './JoinDefinition.js';
import type { AnyJoinInfo, JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo, SubqueryJoinInfo } from './JoinedWhereQuery.js';
import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { SubqueryBuilderLike, TypedSubqueryBuilder } from './SubqueryBuilder.js';
import type { WhereQuery } from './WhereQuery.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance
type AnyModel = TableDefinition<string, any>;

export interface FindResult<
  T extends Record<string, unknown>,
  TReturn,
  TJoins extends AnyJoinInfo = never,
  TSchema extends SchemaDefinition = SchemaDefinition,
  TModels extends Record<string, AnyModel> = DefaultModelsMap,
> extends PromiseLike<TReturn[]> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindResult<T, Pick<T, TKeys>, TJoins, TSchema, TModels>;
  where(args: JoinedWhereQuery<T, TJoins>): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  populate<
    TProperty extends string & PopulatableKeys<TSchema> & keyof T,
    TPopulateType extends ResolveModel<TModels, ModelNameOf<TSchema[TProperty & keyof TSchema] extends SchemaEntry ? TSchema[TProperty & keyof TSchema] : never>>,
    TPopulateSelectKeys extends string & keyof TPopulateType,
  >(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins, TSchema, TModels>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins, TSchema, TModels>;
  /**
   * Join a subquery with type-safe column tracking.
   * Use `agg()` helper when building the subquery to enable type-safe sorting.
   * @example
   * const counts = subquery(ProductRepository)
   *   .select(['store', agg(s => s.count(), 'productCount')])
   *   .groupBy(['store']);
   * StoreRepository.find()
   *   .join(counts, 'stats', { on: { id: 'store' } })
   *   .sort('stats.productCount desc')  // Type-safe!
   */
  join<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindResult<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins, TSchema, TModels>;
  /** @deprecated Use `agg()` helper for type-safe subquery column sorting */
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Record<string, unknown>>>,
  ): FindResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins, TSchema, TModels>;
  /**
   * Left join a subquery with type-safe column tracking.
   * Use `agg()` helper when building the subquery to enable type-safe sorting.
   */
  leftJoin<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindResult<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins, TSchema, TModels>;
  /** @deprecated Use `agg()` helper for type-safe subquery column sorting */
  leftJoin(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  /**
   * Selects distinct rows based on the specified columns (PostgreSQL DISTINCT ON).
   * The ORDER BY clause must start with the same columns in the same order.
   * Cannot be combined with withCount().
   * @param columns - Column names for DISTINCT ON clause
   */
  distinctOn(columns: (string & keyof OmitFunctions<T>)[]): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  sort(value?: JoinedSort<T, TJoins>): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  limit(value: number): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  skip(value: number): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  paginate(options: PaginateOptions): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  withCount(): FindQueryWithCount<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Record<string, unknown>> & keyof T>(
    propertyName: TProperty,
  ): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins, TSchema, TModels>;
  /** Control global filters. false = disable all, { filterName: false } = disable specific */
  filters(value: Record<string, false> | false): FindResult<T, TReturn, TJoins, TSchema, TModels>;
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
