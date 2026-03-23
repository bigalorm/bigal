import type { HasManyKeys, InferSelect, SchemaDefinition } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';

/**
 * Produces the row type for query results.
 *
 * Accepts a TableDefinition, a repository, or a plain row type:
 * - `QueryResult<typeof Product>` - from a model definition (before initialize)
 * - `QueryResult<typeof Product>` - from a repository (after initialize)
 * - `QueryResult<ProductRow>` - from a plain row type (backward compat)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TableDefinition uses any for variance
type AnyTableDef = TableDefinition<string, any>;

type ResolveSchema<TSchema extends SchemaDefinition> = SchemaDefinition extends TSchema ? never : Omit<InferSelect<TSchema>, HasManyKeys<TSchema> & string>;

/** Structural match for repositories - carries schema via phantom `_schema` property */
interface HasSchema<TSchema extends SchemaDefinition = SchemaDefinition> {
  readonly _schema?: TSchema;
}

export type QueryResult<T extends AnyTableDef | HasSchema | Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition> =
  T extends TableDefinition<string, infer TInferredSchema>
    ? Omit<InferSelect<TInferredSchema>, HasManyKeys<TInferredSchema> & string>
    : T extends { _schema?: infer TRepoSchema extends SchemaDefinition }
      ? ResolveSchema<TRepoSchema> extends never
        ? SchemaDefinition extends TSchema
          ? T
          : Omit<T, HasManyKeys<TSchema> & keyof T>
        : ResolveSchema<TRepoSchema>
      : SchemaDefinition extends TSchema
        ? T
        : Omit<T, HasManyKeys<TSchema> & keyof T>;
