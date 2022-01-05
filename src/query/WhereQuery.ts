import type { Entity, NotEntityBrand } from '../Entity';
import type { ExcludeEntityCollections, ExcludeFunctions } from '../types';

type ExcludeUndefined<T> = Exclude<T, undefined>;

export type LiteralValues<TValue> = (ExcludeUndefined<TValue> | null)[] | ExcludeUndefined<TValue> | null;

export type WhereClauseValue<TValue> = TValue extends NotEntityBrand | undefined
  ? Exclude<TValue, undefined> // If the value is not an entity, return the type without undefined
  : Extract<ExcludeUndefined<TValue>, Entity> extends Entity // Otherwise if the type extends Entity
  ?
      | (ExcludeUndefined<Exclude<TValue, Entity>> | null)[] // Allow an array of the literal value (non-entity)
      | (Pick<Extract<ExcludeUndefined<TValue>, Entity>, 'id'> | null)[] // Allow an array of objects with the id property
      | ExcludeUndefined<Exclude<TValue, Entity>> // Allow a single literal value
      | Pick<Extract<ExcludeUndefined<TValue>, Entity>, 'id'> // Allow a single object with the id property
      | null
  : LiteralValues<TValue>; // Otherwise allow literal values

export type StringConstraint<TValue extends string> = {
  [P in 'contains' | 'endsWith' | 'like' | 'startsWith']?: LiteralValues<TValue>;
};

export type NumberOrDateConstraint<TValue extends Date | number> = {
  [P in '<' | '<=' | '>' | '>=']?: LiteralValues<TValue>;
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
        | (ExcludeUndefined<T[K]> | null)[] // Allow array of type
        | T[K] // Allow Single object of type
        | WhereQueryStatement<T[K]> // Allow nested where query statements
        | { '!': LiteralValues<T[K]> }; // Allow arrays of union types
} & {
  or?: WhereQuery<T>[];
};
