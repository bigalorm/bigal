import type { Entity } from '../Entity.js';
import type { GetValueType, ModelRelationshipKeys, PickAsType, PickByValueType, PlainObject, Populated } from '../types/index.js';

import type { JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindOneResultJSON<T extends Entity, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<PlainObject<TReturn> | null> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindOneResultJSON<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindOneResultJSON<T, TReturn, TJoins>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindOneResultJSON<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindOneResultJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Entity>>,
  ): FindOneResultJSON<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Entity>> | TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindOneResultJSON<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(
    propertyName: TProperty,
  ): FindOneResultJSON<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResultJSON<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>, TJoins>;
}

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
  sort(value?: JoinedSort<T, TJoins>): FindOneResult<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>, TJoins>;
  /**
   * Returns result as a plain object instead of an entity class instance.
   * Useful for when data must be serializable.
   */
  toJSON(): FindOneResultJSON<T, TReturn, TJoins>;
}
