import type { Entity, NotEntityBrand } from '../Entity';
import type { EntityPrimitiveOrId, ExcludeFunctionsAndEntityCollections, QueryResult } from '../types';

export type WhereClauseValue<TValue> = TValue extends NotEntityBrand | undefined
  ? Exclude<TValue, undefined>
  : TValue extends Entity
  ?
      | Exclude<EntityPrimitiveOrId<TValue>, undefined>
      | Exclude<EntityPrimitiveOrId<TValue>, undefined>[]
      | Exclude<Pick<QueryResult<TValue>, 'id'>, undefined>
      | Exclude<Pick<QueryResult<TValue>, 'id'>, undefined>[]
      | null
  : Exclude<(TValue | null)[] | TValue, undefined> | null;

export type StringConstraint<TValue extends string> = {
  [P in 'contains' | 'endsWith' | 'like' | 'startsWith']?: WhereClauseValue<TValue>;
};

export type NumberOrDateConstraint<TValue extends Date | number> = {
  [P in '<' | '<=' | '>' | '>=']?: WhereClauseValue<TValue>;
};

export type NegatableConstraint<TValue> =
  | TValue
  | {
      '!': TValue;
    };

export type WhereQueryStatement<TValue> = TValue extends string
  ? NegatableConstraint<StringConstraint<TValue> | WhereClauseValue<TValue>>
  : TValue extends Date | number
  ? NegatableConstraint<NumberOrDateConstraint<TValue> | WhereClauseValue<TValue>>
  : NegatableConstraint<WhereClauseValue<TValue>>;

export type WhereQuery<T extends Entity> = {
  [K in keyof T as ExcludeFunctionsAndEntityCollections<T[K], K>]?: K extends 'id'
    ? WhereQueryStatement<T | T[K]>
    : T[K] extends (infer U)[] | undefined
    ? WhereQueryStatement<U>
    : // NOTE: The extra parts (| Exclude<...>) at the end of the next line are needed for arrays of union types
      Exclude<(T[K] | null)[] | T[K], undefined> | WhereQueryStatement<T[K]> | { '!': Exclude<(T[K] | null)[] | T[K], undefined> };
} & {
  or?: WhereQuery<T>[];
};
