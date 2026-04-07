import type { EntityOrId } from '../types/EntityOrId.js';

import type { BelongsToBuilder, BelongsToConfig } from './BelongsToBuilder.js';
import type { ColumnBuilder, ColumnBuilderConfig } from './ColumnBuilder.js';
import type { HasManyBuilder } from './HasManyBuilder.js';

/**
 * Any value that can appear in a schema definition object passed to `table()`.
 */
export type SchemaEntry = BelongsToBuilder<unknown> | ColumnBuilder<ColumnBuilderConfig> | HasManyBuilder;

/**
 * A schema definition is a record of property names to schema entries.
 */
export type SchemaDefinition = Record<string, SchemaEntry>;

// ---------------------------------------------------------------------------
// Key filtering helpers
// ---------------------------------------------------------------------------

/** Keys for columns and belongsTo (actual database columns) */
type ColumnKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends HasManyBuilder ? never : K;
}[keyof TSchema];

/** Keys for hasMany relationships (collections, available for populate) */
type CollectionKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends HasManyBuilder ? K : never;
}[keyof TSchema];

/** All keys from the schema (columns + collections). Used for external consumers. */
type SelectKeys<TSchema extends SchemaDefinition> = keyof TSchema & string;

/**
 * Keys that are required on insert: notNull columns that have no default, are not primary keys, and are not auto-set.
 * BelongsTo FK columns are always required on insert (they represent a foreign key value).
 */
type RequiredInsertKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends HasManyBuilder
    ? never
    : TSchema[K] extends BelongsToBuilder<unknown>
      ? K
      : TSchema[K] extends ColumnBuilder<infer TConf>
        ? TConf extends { notNull: true }
          ? TConf extends { hasDefault: true }
            ? never
            : TConf extends { isPrimaryKey: true }
              ? never
              : TConf extends { isAutoSet: true }
                ? never
                : K
          : never
        : never;
}[keyof TSchema];

/**
 * Keys that are optional on insert: nullable columns, columns with defaults, primary keys, and auto-set columns.
 * HasMany keys are excluded entirely.
 */
type OptionalInsertKeys<TSchema extends SchemaDefinition> = Exclude<ColumnKeys<TSchema>, RequiredInsertKeys<TSchema>>;

// ---------------------------------------------------------------------------
// Value type extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the TypeScript select type for a single schema entry.
 * - ColumnBuilder: `TData` if notNull, otherwise `TData | null`
 * - BelongsToBuilder: `EntityOrId<TFk>` - accepts FK value or entity object with matching id.
 *   Use `QueryResult` to narrow back to just the FK type for query results.
 * - HasManyBuilder: never (excluded at the key level)
 */
type InferSelectColumn<TEntry extends SchemaEntry> =
  TEntry extends ColumnBuilder<infer TConf> ? (TConf extends { notNull: true } ? TConf['data'] : TConf['data'] | null) : TEntry extends BelongsToBuilder<infer TFk> ? EntityOrId<TFk> : never;

/**
 * Extracts the TypeScript insert type for a single schema entry.
 * Same widening as select: belongsTo accepts FK value or entity object.
 */
type InferInsertColumn<TEntry extends SchemaEntry> =
  TEntry extends ColumnBuilder<infer TConf> ? (TConf extends { notNull: true } ? TConf['data'] : TConf['data'] | null) : TEntry extends BelongsToBuilder<infer TFk> ? EntityOrId<TFk> : never;

// ---------------------------------------------------------------------------
// Public mapped types
// ---------------------------------------------------------------------------

/**
 * Infers the full model type from a schema definition.
 * Includes hasMany as optional `Record<string, unknown>[]` for populate support.
 * Use `QueryResult` to narrow for query results (strips hasMany, narrows belongsTo to FK).
 */
export type InferSelect<TSchema extends SchemaDefinition> = {
  [K in ColumnKeys<TSchema>]: InferSelectColumn<TSchema[K]>;
} & {
  [K in CollectionKeys<TSchema>]?: Record<string, unknown>[];
};

/**
 * Infers the insert (write) type from a schema definition.
 * Required keys are non-nullable columns without defaults.
 * Optional keys include nullable columns, columns with defaults, primary keys, and auto-set columns.
 * HasMany relationships are excluded entirely.
 */
export type InferInsert<TSchema extends SchemaDefinition> = {
  [K in RequiredInsertKeys<TSchema>]: InferInsertColumn<TSchema[K]>;
} & {
  [K in OptionalInsertKeys<TSchema>]?: InferInsertColumn<TSchema[K]>;
};

// ---------------------------------------------------------------------------
// Schema-level key helpers (used by type helpers that need schema awareness)
// ---------------------------------------------------------------------------

/** Keys in the schema that are BelongsToBuilder (many-to-one FK columns) */
export type BelongsToKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends BelongsToBuilder<unknown> ? K : never;
}[keyof TSchema];

/** Keys in the schema that are HasManyBuilder (collection relationships) */
export type HasManyKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends HasManyBuilder ? K : never;
}[keyof TSchema];

/** Keys in the schema that are any relationship (belongsTo or hasMany) */
export type RelationshipKeys<TSchema extends SchemaDefinition> = BelongsToKeys<TSchema> | HasManyKeys<TSchema>;

/** Keys that are populate-able (both belongsTo and hasMany). Falls back to all string keys when schema is default. */
export type PopulatableKeys<TSchema extends SchemaDefinition> = SchemaDefinition extends TSchema ? string : RelationshipKeys<TSchema>;

/** Extracts the branded model name string from a schema entry */
export type ModelNameOf<TEntry extends SchemaEntry> = TEntry extends BelongsToBuilder<unknown, infer TName> ? TName : TEntry extends HasManyBuilder<infer TName> ? TName : never;

// Re-export the key helpers for external use in type-level tests
export type { OptionalInsertKeys, RequiredInsertKeys, SelectKeys };

// Re-export BelongsToConfig for external consumers that need to inspect phantom types
export type { BelongsToConfig };
