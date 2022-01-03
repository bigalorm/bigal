import type { Entity, NotEntityBrand } from '../Entity';
import type { EntityPrimitiveOrId, ExcludeEntityCollections, ExcludeFunctions } from '../types';

export type WhereClauseValue<TValue> = TValue extends NotEntityBrand | undefined
  ? Exclude<TValue, undefined>
  : TValue extends Entity
  ? { id: unknown }[] | Exclude<EntityPrimitiveOrId<TValue>, undefined> | Exclude<EntityPrimitiveOrId<TValue>, undefined>[] | { id: unknown } | null
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
  // Exclude entity collections and functions. Make the rest of the properties optional
  [K in keyof T as ExcludeEntityCollections<T[K], ExcludeFunctions<T[K], K>>]?: K extends 'id'
    ? WhereQueryStatement<T | T[K]> // Allow nested where query statements
    : T[K] extends (infer U)[] | undefined // If property type is an array, allow where query statements for the array type
    ? WhereQueryStatement<U>
    :
        | Exclude<(T[K] | null)[] | T[K], undefined> // Allow arrays or single object of type
        | WhereQueryStatement<T[K]> // Allow nested where query statements
        | { '!': Exclude<(T[K] | null)[] | T[K], undefined> }; // Allow arrays of union types
} & {
  or?: WhereQuery<T>[];
};
