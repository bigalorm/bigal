import type { GetValueType, ModelRelationshipKeys, PickByValueType, Populated } from '../types/index.js';

import type { SubqueryJoinOnCondition } from './JoinDefinition.js';
import type { AnyJoinInfo, JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo, SubqueryJoinInfo } from './JoinedWhereQuery.js';
import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { SubqueryBuilderLike, TypedSubqueryBuilder } from './SubqueryBuilder.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindWithCountResult<TReturn> {
  results: TReturn[];
  totalCount: number;
}

export interface FindQueryWithCount<T extends Record<string, unknown>, TReturn, TJoins extends AnyJoinInfo = never> extends PromiseLike<FindWithCountResult<TReturn>> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindQueryWithCount<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindQueryWithCount<T, TReturn, TJoins>;
  populate<
    TProperty extends string & keyof PickByValueType<T, Record<string, unknown>> & keyof T,
    TPopulateType extends GetValueType<T[TProperty], Record<string, unknown>>,
    TPopulateSelectKeys extends string & keyof TPopulateType,
  >(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindQueryWithCount<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindQueryWithCount<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins>;
  join<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindQueryWithCount<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins>;
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindQueryWithCount<T, TReturn, TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Record<string, unknown>>>,
  ): FindQueryWithCount<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins>;
  leftJoin<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindQueryWithCount<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins>;
  leftJoin(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindQueryWithCount<T, TReturn, TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindQueryWithCount<T, TReturn, TJoins>;
  limit(value: number): FindQueryWithCount<T, TReturn, TJoins>;
  skip(value: number): FindQueryWithCount<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindQueryWithCount<T, TReturn, TJoins>;
}
