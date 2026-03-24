import type { InferSelect, SchemaDefinition } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';
import type { ExcludeEntityCollections, ExcludeFunctions } from '../types/index.js';

import type { ScalarSubquery, SubqueryBuilderLike } from './Subquery.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TableDefinition uses any for variance
type AnyTableDef = TableDefinition<string, any>;

type ExcludeUndefined<T> = Exclude<T, undefined>;
export type LiteralValues<TValue> = (TValue | null)[] | TValue | null;

export type WhereClauseValue<TValue> = LiteralValues<ExcludeUndefined<TValue>>;

export type StringConstraint<TValue extends string> = Partial<Record<'contains' | 'endsWith' | 'like' | 'startsWith', LiteralValues<ExcludeUndefined<TValue>>>>;

export type JsonPropertyValue = boolean | number | string | null;

export type JsonPropertyConstraint = {
  [key: string]: JsonPropertyConstraint | JsonPropertyValue | JsonPropertyValue[] | Partial<Record<'!' | '<' | '<=' | '>' | '>=', JsonPropertyValue>> | undefined;
};

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
      : NegatableConstraint<JsonConstraint<TValue> | JsonPropertyConstraint | SubqueryInConstraint | WhereClauseValue<TValue>>;

/** Structural match for repositories - carries schema via phantom `_schema` property */
interface HasSchema<TSchema extends SchemaDefinition = SchemaDefinition> {
  readonly _schema?: TSchema;
}

type ResolveRow<T> = T extends TableDefinition<string, infer TSchema> ? InferSelect<TSchema> : T extends HasSchema<infer TSchema> ? InferSelect<TSchema> : T;

type WhereQueryRecord<T extends Record<string, unknown>> = {
  // Exclude entity collections and functions. Make the rest of the properties optional
  [K in keyof T as ExcludeEntityCollections<ExcludeFunctions<T[K], K>>]?: K extends 'id'
    ? NegatableConstraint<WhereClauseValue<T>> | WhereQueryStatement<T[K]> // Allow entity objects (via Pick<T,'id'>) and literal id values
    : T[K] extends (infer U)[] | undefined // If property type is an array, allow where query statements for the array type
      ? WhereQueryStatement<ExcludeUndefined<U>>
      :
          | NegatableConstraint<LiteralValues<ExcludeUndefined<T[K]>>> // Allow single object and arrays of type
          | WhereQueryStatement<ExcludeUndefined<T[K]>>; // Allow nested where query statements
} & {
  and?: WhereQueryRecord<T>[];
  or?: WhereQueryRecord<T>[];
  exists?: SubqueryBuilderLike;
  '!'?: Pick<WhereQueryRecord<T>, 'exists'>;
};

/**
 * Where clause type. Accepts a TableDefinition, repository, or row type:
 * - `WhereQuery<typeof Product>` - from a model or repository
 * - `WhereQuery<ProductRow>` - from a plain row type
 */
export type WhereQuery<T extends AnyTableDef | HasSchema | Record<string, unknown>> = WhereQueryRecord<ResolveRow<T> extends Record<string, unknown> ? ResolveRow<T> : Record<string, unknown>>;
