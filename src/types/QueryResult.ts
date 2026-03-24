import type { BelongsToBuilder } from '../schema/BelongsToBuilder.js';
import type { BelongsToKeys, HasManyKeys, InferSelect, SchemaDefinition } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';

/**
 * Produces the row type for query results.
 *
 * Narrows belongsTo fields from `EntityOrId<TFk>` back to just `TFk`, and excludes
 * hasMany collection keys. Query results always contain the FK value, not entity objects.
 *
 * Accepts a TableDefinition, a repository, or a plain row type:
 * - `QueryResult<typeof Product>` - from a model definition or repository
 * - `QueryResult<ProductRow>` - from a plain row type (backward compat)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TableDefinition uses any for variance
type AnyTableDef = TableDefinition<string, any>;

/** Narrows belongsTo fields to FK type and excludes hasMany */
type NarrowForQuery<TSchema extends SchemaDefinition> = {
  [K in Exclude<keyof InferSelect<TSchema>, HasManyKeys<TSchema>>]: K extends BelongsToKeys<TSchema>
    ? TSchema[K & keyof TSchema] extends BelongsToBuilder<infer TFk>
      ? TFk
      : InferSelect<TSchema>[K]
    : InferSelect<TSchema>[K];
};

/** Structural match for repositories - carries schema via phantom `_schema` property */
interface HasSchema<TSchema extends SchemaDefinition = SchemaDefinition> {
  readonly _schema?: TSchema;
}

type ResolveFromSchema<TSchema extends SchemaDefinition> = SchemaDefinition extends TSchema ? never : NarrowForQuery<TSchema>;

export type QueryResult<T extends AnyTableDef | HasSchema | Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition> =
  T extends TableDefinition<string, infer TInferredSchema>
    ? NarrowForQuery<TInferredSchema>
    : T extends { _schema?: infer TRepoSchema extends SchemaDefinition }
      ? ResolveFromSchema<TRepoSchema> extends never
        ? SchemaDefinition extends TSchema
          ? T
          : Omit<T, HasManyKeys<TSchema> & keyof T>
        : ResolveFromSchema<TRepoSchema>
      : SchemaDefinition extends TSchema
        ? T
        : Omit<T, HasManyKeys<TSchema> & keyof T>;
