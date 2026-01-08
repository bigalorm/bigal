import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickByValueType, Populated } from '../types/index.js';

import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

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
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  sort(value?: Sort<T>): FindResult<T, TReturn, TJoins>;
  limit(value: number): FindResult<T, TReturn, TJoins>;
  skip(value: number): FindResult<T, TReturn, TJoins>;
  paginate(options: PaginateOptions): FindResult<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
}
