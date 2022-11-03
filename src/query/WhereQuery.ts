import type { Entity, NotEntityBrand } from '../Entity';
import type { ExcludeEntityCollections, ExcludeFunctions } from '../types';

type ExcludeUndefined<T> = Exclude<T, undefined>;
export type LiteralValues<TValue> = (TValue | null)[] | TValue | null;

export type WhereClauseValue<TValue> = TValue extends NotEntityBrand | undefined
  ? Exclude<TValue, NotEntityBrand | undefined> // If the value is a NotEntityBrand, return the type without undefined
  : Extract<TValue, Entity> extends undefined // Otherwise if the type does not extend Entity
  ? LiteralValues<ExcludeUndefined<TValue>>
  :
      | (ExcludeUndefined<Exclude<TValue, Entity>> | null)[] // Allow an array of the literal value (non-entity)
      | (Pick<Extract<ExcludeUndefined<TValue>, Entity>, 'id'> | null)[] // Allow an array of objects with the id property
      | ExcludeUndefined<Exclude<TValue, Entity>> // Allow a single literal value
      | Pick<Extract<ExcludeUndefined<TValue>, Entity>, 'id'> // Allow a single object with the id property
      | null;

export type StringConstraint<TValue extends string> = {
  [P in 'contains' | 'endsWith' | 'like' | 'startsWith']?: LiteralValues<ExcludeUndefined<TValue>>;
};

export type NumberOrDateConstraint<TValue extends Date | number> = {
  [P in '<' | '<=' | '>' | '>=']?: LiteralValues<ExcludeUndefined<TValue>>;
};

export type NegatableConstraint<TValue> =
  | TValue
  | {
      '!': TValue;
    };

export type WhereQueryStatement<TValue> = [TValue] extends [string]
  ? NegatableConstraint<StringConstraint<TValue> | WhereClauseValue<TValue>>
  : TValue extends Date | number
  ? NegatableConstraint<NumberOrDateConstraint<TValue> | WhereClauseValue<TValue>>
  : NegatableConstraint<WhereClauseValue<TValue>>;

export type WhereQuery<T extends Entity> = {
  // Exclude entity collections and functions. Make the rest of the properties optional
  [K in keyof T as ExcludeEntityCollections<T[K], ExcludeFunctions<T[K], K>>]?: K extends 'id'
    ? WhereQueryStatement<T | T[K]> // Allow nested where query statements
    : T[K] extends (infer U)[] | undefined // If property type is an array, allow where query statements for the array type
    ? WhereQueryStatement<ExcludeUndefined<U>>
    :
        | NegatableConstraint<LiteralValues<ExcludeUndefined<T[K]>>> // Allow Single object and arrays of type
        | WhereQueryStatement<ExcludeUndefined<T[K]>>; // Allow nested where query statements
} & {
  or?: WhereQuery<T>[];
};
