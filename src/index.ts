export * from './initialize.js';
export * from './errors/index.js';
export * from './metadata/index.js';
export * from './query/index.js';
export * from './types/index.js';
export * from './IReadonlyRepository.js';
export * from './IRepository.js';
export * from './ReadonlyRepository.js';
export * from './Repository.js';

// Schema module: selectively export to avoid conflicts with decorator-based API
// The `table` function and `TableOptions` type conflict with the decorator equivalents.
// Consumers of the new API can import directly from 'bigal/schema' or use these named exports.
export {
  belongsTo,
  BelongsToBuilder,
  bigint,
  bigserial,
  boolean,
  booleanArray,
  booleanColumn,
  bytea,
  ColumnBuilder,
  createdAt,
  date,
  dateColumn,
  doublePrecision,
  hasMany,
  HasManyBuilder,
  integer,
  integerArray,
  json,
  jsonb,
  real,
  serial,
  smallint,
  text,
  textArray,
  timestamp,
  timestamptz,
  updatedAt,
  uuid,
  varchar,
  table as defineTable,
  view,
} from './schema/index.js';

export type {
  BelongsToConfig,
  BelongsToEntry,
  ColumnBuilderConfig,
  ColumnBuilderRuntimeConfig,
  ColumnOptions,
  HasManyConfig,
  HasManyEntry,
  HasManyThroughIntermediate,
  InferInsert,
  InferSelect,
  ModelReference,
  ModelHooks,
  OptionalInsertKeys,
  RequiredInsertKeys,
  SchemaDefinition,
  SchemaEntry,
  SelectKeys,
  TableDefinition,
  TableOptions as SchemaTableOptions,
  VarcharOptions,
} from './schema/index.js';
