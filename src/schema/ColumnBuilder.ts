import type { ColumnTypeMetadataOptions } from '../metadata/ColumnTypeMetadata.js';
import { assertValidSqlIdentifier } from '../utils/index.js';

export interface ColumnBuilderConfig<
  TData = unknown,
  TNotNull extends boolean = boolean,
  THasDefault extends boolean = boolean,
  TIsPrimaryKey extends boolean = boolean,
  TIsAutoSet extends boolean = boolean,
> {
  brand: 'column';
  data: TData;
  notNull: TNotNull;
  hasDefault: THasDefault;
  isPrimaryKey: TIsPrimaryKey;
  isAutoSet: TIsAutoSet;
}

export interface ColumnBuilderRuntimeConfig {
  dbColumnName: string;
  columnType: string;
  isNotNull: boolean;
  hasDefaultValue: boolean;
  isPrimaryKey: boolean;
  isAutoSet: boolean;
  isUnique: boolean;
  isCreateDate: boolean;
  isUpdateDate: boolean;
  isVersion: boolean;
  defaultValue: unknown;
  maxLength: number | undefined;
}

export class ColumnBuilder<TConfig extends ColumnBuilderConfig = ColumnBuilderConfig> {
  declare public readonly _: TConfig;

  public readonly config: ColumnBuilderRuntimeConfig;

  public constructor(columnType: string, dbColumnName?: string) {
    if (dbColumnName) {
      assertValidSqlIdentifier(dbColumnName, 'column name');
    }

    this.config = {
      dbColumnName: dbColumnName ?? '',
      columnType,
      isNotNull: false,
      hasDefaultValue: false,
      isPrimaryKey: false,
      isAutoSet: false,
      isUnique: false,
      isCreateDate: false,
      isUpdateDate: false,
      isVersion: false,
      defaultValue: undefined,
      maxLength: undefined,
    };
  }

  public notNull(): ColumnBuilder<TConfig & { notNull: true }> {
    this.config.isNotNull = true;
    return this as unknown as ColumnBuilder<TConfig & { notNull: true }>;
  }

  public default(value: TConfig['data']): ColumnBuilder<TConfig & { hasDefault: true }> {
    this.config.hasDefaultValue = true;
    this.config.defaultValue = value;
    return this as unknown as ColumnBuilder<TConfig & { hasDefault: true }>;
  }

  public primaryKey(): ColumnBuilder<TConfig & { notNull: true; hasDefault: true; isPrimaryKey: true }> {
    this.config.isPrimaryKey = true;
    this.config.isNotNull = true;
    this.config.hasDefaultValue = true;
    return this as unknown as ColumnBuilder<TConfig & { notNull: true; hasDefault: true; isPrimaryKey: true }>;
  }

  public unique(): ColumnBuilder<TConfig> {
    this.config.isUnique = true;
    return this;
  }

  public toColumnTypeMetadataOptions(propertyName: string, tableName: string): ColumnTypeMetadataOptions {
    return {
      target: tableName,
      name: this.config.dbColumnName,
      propertyName,
      type: resolveMetadataType(this.config.columnType),
      required: this.config.isNotNull && !this.config.hasDefaultValue && !this.config.isPrimaryKey && !this.config.isAutoSet,
      insert: !this.config.isAutoSet || this.config.isCreateDate,
      update: !this.config.isPrimaryKey && !this.config.isCreateDate,
      primary: this.config.isPrimaryKey,
      createDate: this.config.isCreateDate,
      updateDate: this.config.isUpdateDate,
      version: this.config.isVersion,
      defaultsTo: normalizeDefaultValue(this.config.defaultValue),
      maxLength: this.config.maxLength,
    };
  }
}

type BigAlColumnType = ColumnTypeMetadataOptions['type'];

function resolveMetadataType(postgresType: string): BigAlColumnType {
  switch (postgresType) {
    case 'SERIAL':
    case 'INTEGER':
    case 'SMALLINT':
      return 'integer';
    case 'BIGSERIAL':
    case 'BIGINT':
      return 'integer';
    case 'REAL':
    case 'DOUBLE PRECISION':
      return 'float';
    case 'TEXT':
    case 'VARCHAR':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    case 'TIMESTAMP':
    case 'TIMESTAMPTZ':
      return 'datetime';
    case 'DATE':
      return 'date';
    case 'JSON':
    case 'JSONB':
      return 'json';
    case 'UUID':
      return 'uuid';
    case 'BYTEA':
      return 'binary';
    case 'TEXT[]':
      return 'string[]';
    case 'INTEGER[]':
      return 'integer[]';
    case 'BOOLEAN[]':
      return 'boolean[]';
    case 'VECTOR':
      return 'float[]';
    default:
      return 'string';
  }
}

function normalizeDefaultValue(value: unknown): ColumnTypeMetadataOptions['defaultsTo'] {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'function') {
    return value as () => Date | Record<string, unknown> | boolean | number | string;
  }

  if (Array.isArray(value)) {
    return value as [] | boolean[] | number[] | string[];
  }

  return undefined;
}
