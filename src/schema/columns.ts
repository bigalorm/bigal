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

export interface ColumnOptions {
  name?: string;
}

export interface VarcharOptions extends ColumnOptions {
  length?: number;
}

export function serial(options?: ColumnOptions): ColumnBuilder<SerialConfig> {
  const builder = new ColumnBuilder('SERIAL', options?.name);
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isPrimaryKey = true;
  return builder as unknown as ColumnBuilder<SerialConfig>;
}

export function bigserial(options?: ColumnOptions): ColumnBuilder<BigSerialConfig> {
  const builder = new ColumnBuilder('BIGSERIAL', options?.name);
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isPrimaryKey = true;
  return builder as unknown as ColumnBuilder<BigSerialConfig>;
}

export function text(options?: ColumnOptions): ColumnBuilder<TextConfig> {
  return new ColumnBuilder('TEXT', options?.name) as unknown as ColumnBuilder<TextConfig>;
}

export function varchar(options?: VarcharOptions): ColumnBuilder<VarcharConfig> {
  const builder = new ColumnBuilder('VARCHAR', options?.name) as unknown as ColumnBuilder<VarcharConfig>;
  if (options?.length) {
    builder.config.maxLength = options.length;
  }

  return builder;
}

export function integer(options?: ColumnOptions): ColumnBuilder<IntegerConfig> {
  return new ColumnBuilder('INTEGER', options?.name) as unknown as ColumnBuilder<IntegerConfig>;
}

export function bigint(options?: ColumnOptions): ColumnBuilder<BigIntConfig> {
  return new ColumnBuilder('BIGINT', options?.name) as unknown as ColumnBuilder<BigIntConfig>;
}

export function smallint(options?: ColumnOptions): ColumnBuilder<SmallIntConfig> {
  return new ColumnBuilder('SMALLINT', options?.name) as unknown as ColumnBuilder<SmallIntConfig>;
}

export function real(options?: ColumnOptions): ColumnBuilder<RealConfig> {
  return new ColumnBuilder('REAL', options?.name) as unknown as ColumnBuilder<RealConfig>;
}

export function doublePrecision(options?: ColumnOptions): ColumnBuilder<DoublePrecisionConfig> {
  return new ColumnBuilder('DOUBLE PRECISION', options?.name) as unknown as ColumnBuilder<DoublePrecisionConfig>;
}

export function booleanColumn(options?: ColumnOptions): ColumnBuilder<BooleanColumnConfig> {
  return new ColumnBuilder('BOOLEAN', options?.name) as unknown as ColumnBuilder<BooleanColumnConfig>;
}

export function timestamp(options?: ColumnOptions): ColumnBuilder<TimestampConfig> {
  return new ColumnBuilder('TIMESTAMP', options?.name) as unknown as ColumnBuilder<TimestampConfig>;
}

export function timestamptz(options?: ColumnOptions): ColumnBuilder<TimestampTzConfig> {
  return new ColumnBuilder('TIMESTAMPTZ', options?.name) as unknown as ColumnBuilder<TimestampTzConfig>;
}

export function dateColumn(options?: ColumnOptions): ColumnBuilder<DateColumnConfig> {
  return new ColumnBuilder('DATE', options?.name) as unknown as ColumnBuilder<DateColumnConfig>;
}

export function json<T = Record<string, unknown>>(options?: ColumnOptions): ColumnBuilder<ColumnBuilderConfig<T>> {
  return new ColumnBuilder('JSON', options?.name) as unknown as ColumnBuilder<ColumnBuilderConfig<T>>;
}

export function jsonb<T = Record<string, unknown>>(options?: ColumnOptions): ColumnBuilder<ColumnBuilderConfig<T>> {
  return new ColumnBuilder('JSONB', options?.name) as unknown as ColumnBuilder<ColumnBuilderConfig<T>>;
}

export function uuid(options?: ColumnOptions): ColumnBuilder<UuidConfig> {
  return new ColumnBuilder('UUID', options?.name) as unknown as ColumnBuilder<UuidConfig>;
}

export function bytea(options?: ColumnOptions): ColumnBuilder<ByteaConfig> {
  return new ColumnBuilder('BYTEA', options?.name) as unknown as ColumnBuilder<ByteaConfig>;
}

export function textArray(options?: ColumnOptions): ColumnBuilder<TextArrayConfig> {
  return new ColumnBuilder('TEXT[]', options?.name) as unknown as ColumnBuilder<TextArrayConfig>;
}

export function integerArray(options?: ColumnOptions): ColumnBuilder<IntegerArrayConfig> {
  return new ColumnBuilder('INTEGER[]', options?.name) as unknown as ColumnBuilder<IntegerArrayConfig>;
}

export function booleanArray(options?: ColumnOptions): ColumnBuilder<BooleanArrayConfig> {
  return new ColumnBuilder('BOOLEAN[]', options?.name) as unknown as ColumnBuilder<BooleanArrayConfig>;
}

export function createdAt(options?: ColumnOptions): ColumnBuilder<CreatedAtConfig> {
  const builder = new ColumnBuilder('TIMESTAMPTZ', options?.name ?? 'created_at');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isAutoSet = true;
  builder.config.isCreateDate = true;
  return builder as unknown as ColumnBuilder<CreatedAtConfig>;
}

export function updatedAt(options?: ColumnOptions): ColumnBuilder<UpdatedAtConfig> {
  const builder = new ColumnBuilder('TIMESTAMPTZ', options?.name ?? 'updated_at');
  builder.config.isNotNull = true;
  builder.config.hasDefaultValue = true;
  builder.config.isAutoSet = true;
  builder.config.isUpdateDate = true;
  return builder as unknown as ColumnBuilder<UpdatedAtConfig>;
}

export { booleanColumn as boolean, dateColumn as date };
