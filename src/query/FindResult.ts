import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickByValueType, PlainObject, Populated } from '../types/index.js';

import type { FindQueryWithCount, FindQueryWithCountJSON } from './FindWithCountResult.js';
import type { SubqueryJoinOnCondition } from './JoinDefinition.js';
import type { JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { SubqueryBuilderLike } from './SubqueryBuilder.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindResultJSON<T extends Entity, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<PlainObject<TReturn>[]> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindResultJSON<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindResultJSON<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindResultJSON<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindResultJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResultJSON<T, TReturn, TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindResultJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  leftJoin(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResultJSON<T, TReturn, TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindResultJSON<T, TReturn, TJoins>;
  limit(value: number): FindResultJSON<T, TReturn, TJoins>;
  skip(value: number): FindResultJSON<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindResultJSON<T, TReturn, TJoins>;
  withCount(): FindQueryWithCountJSON<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(
    propertyName: TProperty,
  ): FindResultJSON<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
}

export interface FindResult<T extends Entity, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<TReturn[]> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindResult<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindResult<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  join(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResult<T, TReturn, TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  leftJoin(subquery: SubqueryBuilderLike, alias: string, options: { on: SubqueryJoinOnCondition }): FindResult<T, TReturn, TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindResult<T, TReturn, TJoins>;
  limit(value: number): FindResult<T, TReturn, TJoins>;
  skip(value: number): FindResult<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindResult<T, TReturn, TJoins>;
  withCount(): FindQueryWithCount<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
  /**
   * Returns results as plain objects instead of entity class instances.
   * Useful for when data must be serializable.
   */
  toJSON(): FindResultJSON<T, TReturn, TJoins>;
}
