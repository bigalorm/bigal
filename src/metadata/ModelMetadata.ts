import _ from 'lodash';

import type { Entity, EntityStatic } from '../Entity.js';

import type { ColumnCollectionMetadata } from './ColumnCollectionMetadata.js';
import type { ColumnModelMetadata } from './ColumnModelMetadata.js';
import type { ColumnTypeMetadata } from './ColumnTypeMetadata.js';

type Column = ColumnCollectionMetadata | ColumnModelMetadata | ColumnTypeMetadata;
type ColumnByStringId = Record<string, Column>;

export interface ModelMetadataOptions<T extends Entity> {
  name: string;
  type: EntityStatic<T>;
  connection?: string;
  tableName?: string;
  readonly?: boolean;
}

export class ModelMetadata<T extends Entity> {
  private _columns: readonly Column[] = [];

  private _primaryKeyColumn: Column | undefined;

  private _createDateColumns: Column[] = [];

  private _updateDateColumns: Column[] = [];

  private _versionDateColumns: Column[] = [];

  public set columns(columns: readonly Column[]) {
    this._columns = columns;
    this.columnsByColumnName = {};
    this.columnsByPropertyName = {};

    for (const column of columns) {
      this.columnsByColumnName[column.name] = column;
      this.columnsByPropertyName[column.propertyName] = column;

      if (column.primary) {
        this._primaryKeyColumn = column;
      }

      if (column.createDate) {
        this._createDateColumns.push(column);
      }

      if (column.updateDate) {
        this._updateDateColumns.push(column);
      }

      if (column.version) {
        this._versionDateColumns.push(column);
      }
    }
  }

  public get columns(): readonly Column[] {
    return this._columns;
  }

  public get primaryKeyColumn(): Column | undefined {
    return this._primaryKeyColumn;
  }

  public get createDateColumns(): readonly Column[] {
    return this._createDateColumns;
  }

  public get updateDateColumns(): readonly Column[] {
    return this._updateDateColumns;
  }

  public get versionColumns(): readonly Column[] {
    return this._versionDateColumns;
  }

  public name: string;

  public type: EntityStatic<T>;

  public connection?: string;

  public tableName: string;

  public readonly: boolean;

  public columnsByColumnName: ColumnByStringId = {};

  public columnsByPropertyName: ColumnByStringId = {};

  public constructor({
    name, //
    type,
    connection,
    tableName,
    readonly = false,
  }: ModelMetadataOptions<T>) {
    this.name = name;
    this.type = type;
    this.connection = connection;
    this.tableName = tableName ?? _.snakeCase(name);
    this.readonly = readonly;
  }
}
