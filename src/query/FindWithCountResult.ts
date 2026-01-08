import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickByValueType, Populated } from '../types/index.js';

import type { JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindWithCountResult<TReturn> {
  results: TReturn[];
  totalCount: number;
}

export interface FindQueryWithCount<T extends Entity, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<FindWithCountResult<TReturn>> {
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
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindQueryWithCount<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindQueryWithCount<T, TReturn, TJoins>;
  limit(value: number): FindQueryWithCount<T, TReturn, TJoins>;
  skip(value: number): FindQueryWithCount<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindQueryWithCount<T, TReturn, TJoins>;
}
