import type { ModelNameOf, PopulatableKeys, SchemaDefinition, SchemaEntry } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';
import type { DefaultModelsMap, GetValueType, ModelRelationshipKeys, PickAsType, PickByValueType, Populated, ResolveModel } from '../types/index.js';

import type { JoinedSort } from './JoinedSort.js';
import type { JoinedWhereQuery, JoinInfo } from './JoinedWhereQuery.js';
import type { PopulateArgs } from './PopulateArgs.js';
import type { WhereQuery } from './WhereQuery.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance
type AnyModel = TableDefinition<string, any>;

export interface FindOneResult<
  T extends Record<string, unknown>,
  TReturn,
  TJoins extends JoinInfo = never,
  TSchema extends SchemaDefinition = SchemaDefinition,
  TModels extends Record<string, AnyModel> = DefaultModelsMap,
> extends PromiseLike<TReturn | null> {
  select<TKeys extends string & keyof T>(keys: TKeys[]): FindOneResult<T, Pick<T, TKeys>, TJoins, TSchema, TModels>;
  where(args: JoinedWhereQuery<T, TJoins>): FindOneResult<T, TReturn, TJoins, TSchema, TModels>;
  populate<
    TProperty extends string & PopulatableKeys<TSchema> & keyof T,
    TPopulateType extends ResolveModel<TModels, ModelNameOf<TSchema[TProperty & keyof TSchema] extends SchemaEntry ? TSchema[TProperty & keyof TSchema] : never>>,
    TPopulateSelectKeys extends string & keyof TPopulateType,
  >(
    propertyName: TProperty,
    options?: PopulateArgs<TPopulateType, TPopulateSelectKeys>,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Populated<T, TProperty, TPopulateType, TPopulateSelectKeys>, TJoins, TSchema, TModels>;
  join<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins, TSchema, TModels>;
  leftJoin<TProperty extends ModelRelationshipKeys<T>, TAlias extends string = TProperty>(
    propertyName: TProperty,
    alias?: TAlias,
    on?: WhereQuery<GetValueType<T[TProperty], Record<string, unknown>>>,
  ): FindOneResult<T, TReturn, JoinInfo<TProperty, TAlias, GetValueType<T[TProperty], Record<string, unknown>>> | TJoins, TSchema, TModels>;
  sort(value?: JoinedSort<T, TJoins>): FindOneResult<T, TReturn, TJoins, TSchema, TModels>;
  UNSAFE_withOriginalFieldType<TProperty extends string & keyof PickByValueType<T, Record<string, unknown>> & keyof T>(
    propertyName: TProperty,
  ): FindOneResult<T, Omit<TReturn, TProperty> & Pick<T, TProperty>, TJoins, TSchema, TModels>;
  UNSAFE_withFieldValue<TProperty extends string & keyof T, TValue extends T[TProperty]>(
    propertyName: TProperty,
    value: TValue,
  ): FindOneResult<T, Omit<TReturn, TProperty> & PickAsType<T, TProperty, TValue>, TJoins, TSchema, TModels>;
  /** Control global filters. false = disable all, { filterName: false } = disable specific */
  filters(value: Record<string, false> | false): FindOneResult<T, TReturn, TJoins, TSchema, TModels>;
  /** Returns the generated SQL and parameters without executing the query. */
  toSQL(): { params: readonly unknown[]; sql: string };
}
