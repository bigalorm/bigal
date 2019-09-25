import * as _ from 'lodash';
import { ColumnTypeMetadata } from './ColumnTypeMetadata';
import { ColumnModelMetadata } from './ColumnModelMetadata';
import { ColumnCollectionMetadata } from './ColumnCollectionMetadata';
import { Entity } from '../Entity';

type Column = ColumnTypeMetadata | ColumnModelMetadata | ColumnCollectionMetadata;
interface ColumnByStringId { [index: string]: Column; }

export interface ModelMetadataOptions {
  name: string;
  type: new() => Entity;
  connection?: string;
  tableName?: string;
  readonly?: boolean;
}

export class ModelMetadata {
  public set columns(columns: Column[]) {
    this._columns = columns;
    this.columnsByColumnName = {};
    this.columnsByPropertyName = {};

    for (const column of columns) {
      this.columnsByColumnName[column.name] = column;
      this.columnsByPropertyName[column.propertyName] = column;

      if (column.primary) {
        this._primaryKeyColumn = column;
      }
    }
  }

  public get columns(): Column[] {
    return this._columns;
  }

  public get primaryKeyColumn(): Column | undefined {
    return this._primaryKeyColumn;
  }
  public name: string;
  public type: new() => Entity;
  public connection?: string;
  public tableName: string;
  public readonly: boolean;
  public columnsByColumnName: ColumnByStringId = {};
  public columnsByPropertyName: ColumnByStringId = {};
  private _columns: Column[] = [];
  private _primaryKeyColumn: Column | undefined;

  constructor({
    name,
    type,
    connection,
    tableName,
    readonly = false,
  }: ModelMetadataOptions) {
    this.name = name;
    this.type = type;
    this.connection = connection;
    this.tableName = tableName || _.snakeCase(name);
    this.readonly = readonly;
  }
}
