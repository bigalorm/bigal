import type { ColumnBuilderConfig } from './ColumnBuilder.js';
import { ColumnBuilder } from './ColumnBuilder.js';

type SerialConfig = ColumnBuilderConfig<number, true, true, true>;
type BigSerialConfig = ColumnBuilderConfig<number, true, true, true>;
type TextConfig = ColumnBuilderConfig<string>;
type VarcharConfig = ColumnBuilderConfig<string>;
type IntegerConfig = ColumnBuilderConfig<number>;
type BigIntConfig = ColumnBuilderConfig<number>;
type SmallIntConfig = ColumnBuilderConfig<number>;
type RealConfig = ColumnBuilderConfig<number>;
type DoublePrecisionConfig = ColumnBuilderConfig<number>;
type BooleanColumnConfig = ColumnBuilderConfig<boolean>;
type TimestampConfig = ColumnBuilderConfig<Date>;
type TimestampTzConfig = ColumnBuilderConfig<Date>;
type DateColumnConfig = ColumnBuilderConfig<Date>;
type UuidConfig = ColumnBuilderConfig<string>;
type ByteaConfig = ColumnBuilderConfig<Buffer>;
type TextArrayConfig = ColumnBuilderConfig<string[]>;
type IntegerArrayConfig = ColumnBuilderConfig<number[]>;
type BooleanArrayConfig = ColumnBuilderConfig<boolean[]>;
type CreatedAtConfig = ColumnBuilderConfig<Date, true, true, false, true>;
type UpdatedAtConfig = ColumnBuilderConfig<Date, true, true, false, true>;

export interface VarcharOptions {
  length?: number;
}

export function serial(dbName: string): ColumnBuilder<SerialConfig> {
  const builder = new ColumnBuilder(dbName, 'SERIAL');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isPrimaryKey = true;
  return builder as unknown as ColumnBuilder<SerialConfig>;
}

export function bigserial(dbName: string): ColumnBuilder<BigSerialConfig> {
  const builder = new ColumnBuilder(dbName, 'BIGSERIAL');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isPrimaryKey = true;
  return builder as unknown as ColumnBuilder<BigSerialConfig>;
}

export function text(dbName: string): ColumnBuilder<TextConfig> {
  return new ColumnBuilder(dbName, 'TEXT') as unknown as ColumnBuilder<TextConfig>;
}

export function varchar(dbName: string, options?: VarcharOptions): ColumnBuilder<VarcharConfig> {
  const builder = new ColumnBuilder(dbName, 'VARCHAR') as unknown as ColumnBuilder<VarcharConfig>;
  if (options?.length) {
    builder.config.maxLength = options.length;
  }

  return builder;
}

export function integer(dbName: string): ColumnBuilder<IntegerConfig> {
  return new ColumnBuilder(dbName, 'INTEGER') as unknown as ColumnBuilder<IntegerConfig>;
}

export function bigint(dbName: string): ColumnBuilder<BigIntConfig> {
  return new ColumnBuilder(dbName, 'BIGINT') as unknown as ColumnBuilder<BigIntConfig>;
}

export function smallint(dbName: string): ColumnBuilder<SmallIntConfig> {
  return new ColumnBuilder(dbName, 'SMALLINT') as unknown as ColumnBuilder<SmallIntConfig>;
}

export function real(dbName: string): ColumnBuilder<RealConfig> {
  return new ColumnBuilder(dbName, 'REAL') as unknown as ColumnBuilder<RealConfig>;
}

export function doublePrecision(dbName: string): ColumnBuilder<DoublePrecisionConfig> {
  return new ColumnBuilder(dbName, 'DOUBLE PRECISION') as unknown as ColumnBuilder<DoublePrecisionConfig>;
}

export function booleanColumn(dbName: string): ColumnBuilder<BooleanColumnConfig> {
  return new ColumnBuilder(dbName, 'BOOLEAN') as unknown as ColumnBuilder<BooleanColumnConfig>;
}

export function timestamp(dbName: string): ColumnBuilder<TimestampConfig> {
  return new ColumnBuilder(dbName, 'TIMESTAMP') as unknown as ColumnBuilder<TimestampConfig>;
}

export function timestamptz(dbName: string): ColumnBuilder<TimestampTzConfig> {
  return new ColumnBuilder(dbName, 'TIMESTAMPTZ') as unknown as ColumnBuilder<TimestampTzConfig>;
}

export function dateColumn(dbName: string): ColumnBuilder<DateColumnConfig> {
  return new ColumnBuilder(dbName, 'DATE') as unknown as ColumnBuilder<DateColumnConfig>;
}

export function json<T = Record<string, unknown>>(dbName: string): ColumnBuilder<ColumnBuilderConfig<T>> {
  return new ColumnBuilder(dbName, 'JSON') as unknown as ColumnBuilder<ColumnBuilderConfig<T>>;
}

export function jsonb<T = Record<string, unknown>>(dbName: string): ColumnBuilder<ColumnBuilderConfig<T>> {
  return new ColumnBuilder(dbName, 'JSONB') as unknown as ColumnBuilder<ColumnBuilderConfig<T>>;
}

export function uuid(dbName: string): ColumnBuilder<UuidConfig> {
  return new ColumnBuilder(dbName, 'UUID') as unknown as ColumnBuilder<UuidConfig>;
}

export function bytea(dbName: string): ColumnBuilder<ByteaConfig> {
  return new ColumnBuilder(dbName, 'BYTEA') as unknown as ColumnBuilder<ByteaConfig>;
}

export function textArray(dbName: string): ColumnBuilder<TextArrayConfig> {
  return new ColumnBuilder(dbName, 'TEXT[]') as unknown as ColumnBuilder<TextArrayConfig>;
}

export function integerArray(dbName: string): ColumnBuilder<IntegerArrayConfig> {
  return new ColumnBuilder(dbName, 'INTEGER[]') as unknown as ColumnBuilder<IntegerArrayConfig>;
}

export function booleanArray(dbName: string): ColumnBuilder<BooleanArrayConfig> {
  return new ColumnBuilder(dbName, 'BOOLEAN[]') as unknown as ColumnBuilder<BooleanArrayConfig>;
}

export function createdAt(dbName = 'created_at'): ColumnBuilder<CreatedAtConfig> {
  const builder = new ColumnBuilder(dbName, 'TIMESTAMPTZ');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isAutoSet = true;
  builder.config.isCreateDate = true;
  return builder as unknown as ColumnBuilder<CreatedAtConfig>;
}

export function updatedAt(dbName = 'updated_at'): ColumnBuilder<UpdatedAtConfig> {
  const builder = new ColumnBuilder(dbName, 'TIMESTAMPTZ');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isAutoSet = true;
  builder.config.isUpdateDate = true;
  return builder as unknown as ColumnBuilder<UpdatedAtConfig>;
}

// Re-export with aliases that match the plan's consumer API names.
// The plan calls them `boolean` and `date`, but those shadow global types.
// Consumers import `boolean` (the function) from 'bigal', which works because
// ES module named exports don't collide with global type names.
export { booleanColumn as boolean, dateColumn as date };
