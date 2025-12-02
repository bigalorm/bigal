import type { Entity } from '../Entity.js';
import type { GetValueType, PickByValueType, Populated } from '../types/index.js';

import type { PaginateOptions } from './PaginateOptions.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindResult<T extends Entity, TReturn> extends PromiseLike<TReturn[]> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindResult<T, Pick<T, TKeys>>;
  where(args: WhereQuery<T>): FindResult<T, TReturn>;
  populate<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T, TPopulateType extends GetValueType<T[TProperty], Entity>, TPopulateSelectKeys extends string & keyof TPopulateType>(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>>;
  sort(value?: Sort<T>): FindResult<T, TReturn>;
  limit(value: number): FindResult<T, TReturn>;
  skip(value: number): FindResult<T, TReturn>;
  paginate(options: PaginateOptions): FindResult<T, TReturn>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Entity> & keyof T>(propertyName: TProperty): FindResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>>;
}
