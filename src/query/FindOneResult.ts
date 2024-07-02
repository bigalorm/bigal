import type { Entity } from '../Entity.js';
import type { GetValueType, PickByValueType, PickAsType, Populated } from '../types/index.js';

import type { PopulateArgs } from './PopulateArgs.js';
import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

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
