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

/**
 * Extracts keys whose value is a ColumnBuilder or BelongsToBuilder (i.e., actual database columns).
 * HasMany entries are excluded because they don't correspond to columns on this table.
 */
type SelectKeys<TSchema extends SchemaDefinition> = {
  [K in keyof TSchema]: TSchema[K] extends HasManyBuilder ? never : K;
}[keyof TSchema];

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
type OptionalInsertKeys<TSchema extends SchemaDefinition> = Exclude<SelectKeys<TSchema>, RequiredInsertKeys<TSchema>>;

// ---------------------------------------------------------------------------
// Value type extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the TypeScript select type for a single schema entry.
 * - ColumnBuilder: `TData` if notNull is true, otherwise `TData | null`
 * - BelongsToBuilder: the FK type (typically `number`)
 * - HasManyBuilder: never (excluded at the key level)
 */
type InferSelectColumn<TEntry extends SchemaEntry> =
  TEntry extends ColumnBuilder<infer TConf> ? (TConf extends { notNull: true } ? TConf['data'] : TConf['data'] | null) : TEntry extends BelongsToBuilder<infer TFk> ? TFk : never;

/**
 * Extracts the TypeScript insert type for a single schema entry.
 * Same as select type: the insert value for a column is the same TS type,
 * but whether the key is required or optional is handled by RequiredInsertKeys/OptionalInsertKeys.
 */
type InferInsertColumn<TEntry extends SchemaEntry> =
  TEntry extends ColumnBuilder<infer TConf> ? (TConf extends { notNull: true } ? TConf['data'] : TConf['data'] | null) : TEntry extends BelongsToBuilder<infer TFk> ? TFk : never;

// ---------------------------------------------------------------------------
// Public mapped types
// ---------------------------------------------------------------------------

/**
 * Infers the select (read) type from a schema definition.
 * HasMany relationships are excluded. BelongsTo resolves to its FK type.
 * Nullable columns include `| null` in their type.
 */
export type InferSelect<TSchema extends SchemaDefinition> = {
  [K in SelectKeys<TSchema>]: InferSelectColumn<TSchema[K]>;
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

// Re-export the key helpers for external use in type-level tests
export type { OptionalInsertKeys, RequiredInsertKeys, SelectKeys };

// Re-export BelongsToConfig for external consumers that need to inspect phantom types
export type { BelongsToConfig };
