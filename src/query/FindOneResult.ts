import type { Entity } from '../Entity';
import type { GetValueType, PickByValueType, PickAsType, Populated } from '../types';

import type { PopulateArgs } from './PopulateArgs';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneResult<T extends Entity, TReturn> extends PromiseLike<TReturn | null> {
  where(args: WhereQuery<T>): FindOneResult<T, TReturn>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>>;
  sort(value?: Sort<T>): FindOneResult<T, TReturn>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>>;
}
