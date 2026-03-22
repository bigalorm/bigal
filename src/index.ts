import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import type { InferSelect } from './schema/InferTypes.js';
import type { TableDefinition } from './schema/TableDefinition.js';

export * from './initialize.js';
export * from './errors/index.js';
export * from './metadata/index.js';
export * from './query/index.js';
export * from './types/index.js';
export * from './IReadonlyRepository.js';
export * from './IRepository.js';

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
  FilterDefinition,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any TableDefinition
type AnyTableDef = TableDefinition<string, any>;

/** A typed read-write repository for a model: `Repository<typeof Product>` */
export type Repository<T extends AnyTableDef> = T extends TableDefinition<string, infer TSchema> ? IRepository<InferSelect<TSchema>> : never;

/** A typed read-only repository for a model: `ReadonlyRepository<typeof StoreSummary>` */
export type ReadonlyRepository<T extends AnyTableDef> = T extends TableDefinition<string, infer TSchema> ? IReadonlyRepository<InferSelect<TSchema>> : never;
