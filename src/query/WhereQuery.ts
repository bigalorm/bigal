import type { Entity, NotEntityBrand } from '../Entity.js';
import type { ExcludeEntityCollections, ExcludeFunctions } from '../types/index.js';

import type { VectorDistanceMetric } from './Sort.js';
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

export type JsonPropertyValue = boolean | number | string | null;

export type JsonPropertyConstraint = {
  [key: string]: JsonPropertyConstraint | JsonPropertyValue | JsonPropertyValue[] | Partial<Record<'!' | '<' | '<=' | '>' | '>=', JsonPropertyValue>> | undefined;
};

export type JsonConstraint<TValue> = Partial<Record<'contains', ExcludeUndefined<TValue> | LiteralValues<ExcludeUndefined<TValue>>>>;

export type NumberOrDateConstraint<TValue extends Date | number> = Partial<Record<'<' | '<=' | '>' | '>=', LiteralValues<ExcludeUndefined<TValue>>>>;

export interface VectorDistanceConstraint {
  nearestTo: number[];
  metric?: VectorDistanceMetric;
  /**
   * Distance bound(s) combined with AND. Required: pgvector distance operators return a number, so a where
   * constraint without a bound would not be a boolean expression. Use `sort({ column: { nearestTo } })` to
   * order by distance instead.
   */
  distance: Partial<Record<'<' | '<=' | '>' | '>=', number>>;
}

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
      : NegatableConstraint<JsonConstraint<TValue> | JsonPropertyConstraint | SubqueryInConstraint | WhereClauseValue<TValue>>;

export type WhereQuery<T extends Entity> = {
  // Exclude entity collections and functions. Make the rest of the properties optional
  [K in keyof T as ExcludeEntityCollections<T[K], ExcludeFunctions<T[K], K>>]?: K extends 'id'
    ? NegatableConstraint<WhereClauseValue<T>> | WhereQueryStatement<T[K]> // Allow entity objects (via Pick<T,'id'>) and literal id values
    : T[K] extends (infer U)[] | undefined // If property type is an array, allow where query statements for the array type
      ? [U] extends [number] // Avoid distributive conditional type check. number[] properties may be vector columns, so allow distance constraints
        ? VectorDistanceConstraint | WhereQueryStatement<ExcludeUndefined<U>>
        : WhereQueryStatement<ExcludeUndefined<U>>
      :
          | NegatableConstraint<LiteralValues<ExcludeUndefined<T[K]>>> // Allow Single object and arrays of type
          | WhereQueryStatement<ExcludeUndefined<T[K]>>; // Allow nested where query statements
} & {
  and?: WhereQuery<T>[];
  or?: WhereQuery<T>[];
  exists?: SubqueryBuilderLike;
  '!'?: Pick<WhereQuery<T>, 'exists'>;
};
