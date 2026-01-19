import type { Entity, NotEntityBrand } from '../Entity.js';
import type { ExcludeEntityCollections, ExcludeFunctions } from '../types/index.js';

import type { ScalarSubquery, SubqueryBuilderLike } from './Subquery.js';

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

export type StringConstraint<TValue extends string> = Partial<Record<'contains' | 'endsWith' | 'like' | 'startsWith', LiteralValues<ExcludeUndefined<TValue>>>>;

export type JsonConstraint<TValue> = Partial<Record<'contains', ExcludeUndefined<TValue> | LiteralValues<ExcludeUndefined<TValue>>>>;

export type NumberOrDateConstraint<TValue extends Date | number> = Partial<Record<'<' | '<=' | '>' | '>=', LiteralValues<ExcludeUndefined<TValue>>>>;

export interface SubqueryInConstraint {
  in: SubqueryBuilderLike;
}

export type ScalarSubqueryConstraint<TValue> = Partial<Record<'<' | '<=' | '>' | '>=', ScalarSubquery<TValue | undefined> | ScalarSubquery<TValue>>>;

export type NumberOrDateConstraintWithSubquery<TValue extends Date | number> = NumberOrDateConstraint<TValue> | ScalarSubqueryConstraint<TValue>;

export type NegatableConstraint<TValue> =
  | TValue
  | {
      '!': TValue;
    };

export type WhereQueryStatement<TValue> = [TValue] extends [string] // Avoid distributive conditional type check for union types
  ? NegatableConstraint<StringConstraint<TValue> | SubqueryInConstraint | WhereClauseValue<TValue>>
  : TValue extends string // Handle string types not covered by the previous check. Eg string | null
    ? NegatableConstraint<StringConstraint<TValue> | SubqueryInConstraint | WhereClauseValue<TValue>>
    : TValue extends Date | number
      ? NegatableConstraint<NumberOrDateConstraintWithSubquery<TValue> | SubqueryInConstraint | WhereClauseValue<TValue>>
      : NegatableConstraint<JsonConstraint<TValue> | SubqueryInConstraint | WhereClauseValue<TValue>>;

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
  and?: WhereQuery<T>[];
  or?: WhereQuery<T>[];
  exists?: SubqueryBuilderLike;
  '!'?: Pick<WhereQuery<T>, 'exists'>;
};
