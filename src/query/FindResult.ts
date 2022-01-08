import type { Entity } from '../Entity';
import type { PickByValueType, GetValueType, Populated } from '../types';

import type { PaginateOptions } from './PaginateOptions';
import type { PopulateArgs } from './PopulateArgs';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindResult<T extends Entity, TReturn> extends PromiseLike<TReturn[]> {
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
