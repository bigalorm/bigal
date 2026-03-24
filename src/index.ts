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
  double,
  float,
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
  vector,
  table as defineTable,
  view,
} from './schema/index.js';

export type {
  BelongsToConfig,
  BelongsToEntry,
  BelongsToKeys,
  ColumnBuilderConfig,
  ColumnBuilderRuntimeConfig,
  ColumnOptions,
  FilterDefinition,
  HasManyConfig,
  HasManyEntry,
  HasManyKeys,
  HasManyThroughIntermediate,
  InferInsert,
  InferSelect,
  ModelHooks,
  OptionalInsertKeys,
  RelationshipKeys,
  RequiredInsertKeys,
  SchemaDefinition,
  SchemaEntry,
  SelectKeys,
  TableDefinition,
  TableOptions as SchemaTableOptions,
  VarcharOptions,
  VectorOptions,
} from './schema/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any TableDefinition
type AnyTableDef = TableDefinition<string, any>;

/**
 * A typed read-write repository for a model. Provides find, findOne, create,
 * update, destroy, and populate operations with full type safety.
 *
 * @example
 * ```typescript
 * import type { Repository } from 'bigal';
 *
 * function processProducts(repo: Repository<typeof Product>) {
 *   const products = await repo.find().where({ name: 'Widget' });
 * }
 * ```
 */
export type Repository<T extends AnyTableDef> = T extends TableDefinition<string, infer TSchema> ? IRepository<InferSelect<TSchema>, TSchema> : never;

/**
 * A typed read-only repository for a model backed by a PostgreSQL view.
 * Provides find, findOne, and count operations.
 *
 * @example
 * ```typescript
 * import type { ReadonlyRepository } from 'bigal';
 *
 * function readSummary(repo: ReadonlyRepository<typeof StoreSummary>) {
 *   const summary = await repo.findOne().where({ id: 1 });
 * }
 * ```
 */
export type ReadonlyRepository<T extends AnyTableDef> = T extends TableDefinition<string, infer TSchema> ? IReadonlyRepository<InferSelect<TSchema>, TSchema> : never;
