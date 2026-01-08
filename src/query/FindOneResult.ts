import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickAsType, PickByValueType, Populated } from '../types/index.js';

import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindOneResult<T extends Entity, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<TReturn | null> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindOneResult<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindOneResult<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  sort(value?: Sort<T>): FindOneResult<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>, TJoins>;
}
