import type { GetValueType, ModelRelationshipKeys, PickAsType, PickByValueType, Populated } from '../types/index.js';

import type { JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindOneResult<T extends Record<string, unknown>, TReturn, TJoins extends JoinInfo = never> extends PromiseLike<TReturn | null> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindOneResult<T, Pick<T, TKeys>, TJoins>;
  where(args: JoinedWhereQuery<T, TJoins>): FindOneResult<T, TReturn, TJoins>;
  populate<
    TProperty extends string & keyof PickByValueType<T, Record<string, unknown>> & keyof T,
    TPopulateType extends GetValueType<T[TProperty], Record<string, unknown>>,
    TPopulateSelectKeys extends string & keyof TPopulateType,
  >(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Record<string, unknown>>>,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins>;
  sort(value?: JoinedSort<T, TJoins>): FindOneResult<T, TReturn, TJoins>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Record<string, unknown>> & keyof T>(
    propertyName: TProperty,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>, TJoins>;
  /** Control global filters. false = disable all, { filterName: false } = disable specific */
  filters(value: Record<string, false> | false): FindOneResult<T, TReturn, TJoins>;
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
