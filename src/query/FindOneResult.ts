import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { Entity } from '../Entity';
import type { GetValueType, PickAsPopulated, PickByValueType, PickAsType, QueryResult } from '../types';

import type { PopulateArgs } from './PopulateArgs';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneResult<T extends Entity, TReturn> extends ChainablePromiseLike<TReturn | null> {
  where(args: WhereQuery<T>): FindOneResult<T, TReturn>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(
    propertyName: TProperty,
    options?: PopulateArgs<GetValueType<PickByValueType<T, Entity>[TProperty], Entity>>,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsPopulated<T, TProperty>>;
  sort(value?: Sort<T>): FindOneResult<T, TReturn>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<QueryResult<T>, TProperty> & PickAsType<T, TProperty, TValue>>;
}
