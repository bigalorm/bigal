import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickByValueType, PlainObject, Populated } from '../types/index.js';

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

export interface FindQueryWithCountJSON<T extends Entity, TReturn, TJoins extends AnyJoinInfo = never> extends PromiseLike<FindWithCountResult<PlainObject<TReturn>>> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindQueryWithCountJSON<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindQueryWithCountJSON<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindQueryWithCountJSON<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindQueryWithCountJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  join<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindQueryWithCountJSON<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins>;
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindQueryWithCountJSON<T, TReturn, TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindQueryWithCountJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  leftJoin<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindQueryWithCountJSON<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins>;
  leftJoin(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindQueryWithCountJSON<T, TReturn, TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindQueryWithCountJSON<T, TReturn, TJoins>;
  limit(value: number): FindQueryWithCountJSON<T, TReturn, TJoins>;
  skip(value: number): FindQueryWithCountJSON<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindQueryWithCountJSON<T, TReturn, TJoins>;
}

export interface FindQueryWithCount<T extends Entity, TReturn, TJoins extends AnyJoinInfo = never> extends PromiseLike<FindWithCountResult<TReturn>> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindQueryWithCount<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindQueryWithCount<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindQueryWithCount<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindQueryWithCount<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  join<TAlias extends string, TColumns extends string>(
    subquery: TypedSubqueryBuilder<TColumns>,
    alias: TAlias,
    options: { on: SubqueryJoinOnCondition },
  ): FindQueryWithCount<T, TReturn, SubqueryJoinInfo<TAlias, TColumns> | TJoins>;
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindQueryWithCount<T, TReturn, TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindQueryWithCount<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
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
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): FindQueryWithCountJSON<T, TReturn, TJoins>;
}
