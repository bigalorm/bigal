import { ColumnCollectionMetadata } from '../metadata/ColumnCollectionMetadata.js';
import { ColumnModelMetadata } from '../metadata/ColumnModelMetadata.js';
import { ColumnTypeMetadata } from '../metadata/ColumnTypeMetadata.js';
import { assertValidSqlIdentifier } from '../utils/index.js';

import { BelongsToBuilder } from './BelongsToBuilder.js';
import { ColumnBuilder } from './ColumnBuilder.js';
import { HasManyBuilder } from './HasManyBuilder.js';
import type { InferInsert, InferSelect, SchemaDefinition } from './InferTypes.js';

// ---------------------------------------------------------------------------
// Column metadata union (same as used by ModelMetadata)
// ---------------------------------------------------------------------------

type ColumnMetadata = ColumnCollectionMetadata | ColumnModelMetadata | ColumnTypeMetadata;
type ColumnByStringId = Record<string, ColumnMetadata>;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface ModelHooks<TInsert> {
  beforeCreate?: (values: TInsert) => Promise<TInsert> | TInsert;
  beforeUpdate?: (values: Partial<TInsert>) => Partial<TInsert> | Promise<Partial<TInsert>>;
}

// ---------------------------------------------------------------------------
// Table options
// ---------------------------------------------------------------------------

export interface TableOptions<TInsert> {
  schema?: string;
  readonly?: boolean;
  connection?: string;
  hooks?: ModelHooks<TInsert>;
}

// ---------------------------------------------------------------------------
// TableDefinition
// ---------------------------------------------------------------------------

export interface TableDefinition<TName extends string = string, TSchema extends SchemaDefinition = SchemaDefinition> {
  readonly tableName: TName;
  readonly dbSchema: string | undefined;
  readonly isReadonly: boolean;
  readonly connection: string | undefined;
  readonly schema: TSchema;
  readonly hooks: ModelHooks<InferInsert<TSchema>> | undefined;

  readonly columnsByPropertyName: Readonly<ColumnByStringId>;
  readonly columnsByColumnName: Readonly<ColumnByStringId>;
  readonly columns: readonly ColumnMetadata[];
  readonly primaryKeyColumn: ColumnMetadata | undefined;
  readonly createDateColumns: readonly ColumnMetadata[];
  readonly updateDateColumns: readonly ColumnMetadata[];
  readonly versionColumns: readonly ColumnMetadata[];

  readonly belongsToEntries: readonly BelongsToEntry[];
  readonly hasManyEntries: readonly HasManyEntry[];

  readonly $inferSelect: InferSelect<TSchema>;
  readonly $inferInsert: InferInsert<TSchema>;
}

export interface BelongsToEntry {
  readonly propertyName: string;
  readonly builder: BelongsToBuilder<unknown>;
}

export interface HasManyEntry {
  readonly propertyName: string;
  readonly builder: HasManyBuilder;
}

// ---------------------------------------------------------------------------
// Internal helpers for building metadata from schema entries
// ---------------------------------------------------------------------------

function buildColumnTypeMetadata(entry: ColumnBuilder, propertyName: string, tableName: string): ColumnTypeMetadata {
  return new ColumnTypeMetadata(entry.toColumnTypeMetadataOptions(propertyName, tableName));
}

function buildColumnModelMetadata(entry: BelongsToBuilder<unknown>, propertyName: string, tableName: string): ColumnModelMetadata {
  return new ColumnModelMetadata({
    target: tableName,
    name: entry.dbColumnName,
    propertyName,
    required: true,
    model: () => {
      const referencedTable = entry.modelFn();
      return referencedTable.tableName;
    },
  });
}

function buildColumnCollectionMetadata(entry: HasManyBuilder, propertyName: string, tableName: string): ColumnCollectionMetadata {
  return new ColumnCollectionMetadata({
    target: tableName,
    name: '',
    propertyName,
    required: false,
    insert: false,
    update: false,
    collection: () => {
      const referencedTable = entry.modelFn();
      return referencedTable.tableName;
    },
    via: entry.viaPropertyName ?? '',
    through: entry.throughFn
      ? () => {
          const throughTable = entry.throughFn!();
          return throughTable.tableName;
        }
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// table() factory
// ---------------------------------------------------------------------------

export function table<TName extends string, TSchema extends SchemaDefinition>(
  tableName: TName,
  schemaDefinition: TSchema,
  options?: TableOptions<InferInsert<TSchema>>,
): TableDefinition<TName, TSchema> {
  assertValidSqlIdentifier(tableName, 'table name');

  if (options?.schema) {
    assertValidSqlIdentifier(options.schema, 'database schema');
  }

  const columnsByPropertyName: ColumnByStringId = {};
  const columnsByColumnName: ColumnByStringId = {};
  const allColumns: ColumnMetadata[] = [];
  let primaryKeyColumn: ColumnMetadata | undefined;
  const createDateColumns: ColumnMetadata[] = [];
  const updateDateColumns: ColumnMetadata[] = [];
  const versionColumns: ColumnMetadata[] = [];
  const belongsToEntries: BelongsToEntry[] = [];
  const hasManyEntries: HasManyEntry[] = [];

  for (const [propertyName, entry] of Object.entries(schemaDefinition)) {
    if (entry instanceof ColumnBuilder) {
      const metadata = buildColumnTypeMetadata(entry, propertyName, tableName);

      columnsByPropertyName[propertyName] = metadata;
      columnsByColumnName[metadata.name] = metadata;
      allColumns.push(metadata);

      if (metadata.primary) {
        primaryKeyColumn = metadata;
      }

      if (metadata.createDate) {
        createDateColumns.push(metadata);
      }

      if (metadata.updateDate) {
        updateDateColumns.push(metadata);
      }

      if (metadata.version) {
        versionColumns.push(metadata);
      }
    } else if (entry instanceof BelongsToBuilder) {
      belongsToEntries.push({ propertyName, builder: entry });

      const metadata = buildColumnModelMetadata(entry, propertyName, tableName);

      columnsByPropertyName[propertyName] = metadata;
      columnsByColumnName[metadata.name] = metadata;
      allColumns.push(metadata);
    } else if (entry instanceof HasManyBuilder) {
      hasManyEntries.push({ propertyName, builder: entry });

      const metadata = buildColumnCollectionMetadata(entry, propertyName, tableName);

      columnsByPropertyName[propertyName] = metadata;
      columnsByColumnName[propertyName] = metadata;
      allColumns.push(metadata);
    }
  }

  const definition: TableDefinition<TName, TSchema> = {
    tableName,
    dbSchema: options?.schema,
    isReadonly: options?.readonly ?? false,
    connection: options?.connection,
    schema: schemaDefinition,
    hooks: options?.hooks,

    columnsByPropertyName,
    columnsByColumnName,
    columns: allColumns,
    primaryKeyColumn,
    createDateColumns,
    updateDateColumns,
    versionColumns,

    belongsToEntries,
    hasManyEntries,

    // Phantom types -- only used by TypeScript, never at runtime
    $inferSelect: undefined as unknown as InferSelect<TSchema>,
    $inferInsert: undefined as unknown as InferInsert<TSchema>,
  };

  return Object.freeze(definition);
}
