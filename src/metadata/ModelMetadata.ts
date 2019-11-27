import * as _ from 'lodash';
import { ColumnTypeMetadata } from './ColumnTypeMetadata';
import { ColumnModelMetadata } from './ColumnModelMetadata';
import { ColumnCollectionMetadata } from './ColumnCollectionMetadata';
import { Entity, EntityStatic } from '../Entity';

type Column = ColumnTypeMetadata | ColumnModelMetadata | ColumnCollectionMetadata;
interface ColumnByStringId { [index: string]: Column }
type ColumnsByPropertyName<T extends Entity, K extends keyof T> = {
  [P in Extract<keyof T, K>]: Column;
}

export type Identity<T> = T;
export type Pick2<T, K extends keyof T> = Identity<
  {
    [P in K]: T[P];
  }
>;

function isKeyOf<T, K extends keyof any>(obj: T, key: K): asserts K is Extract<keyof T, K> {
  return typeof obj[key] !== undefined;
}

// function isKeyOf<T, K extends keyof T>(obj: T): asserts  {
//
// }

export interface ModelMetadataOptions<T extends Entity = Entity> {
  name: string;
  type: EntityStatic<T>;
  connection?: string;
  tableName?: string;
  readonly?: boolean;
}

export class ModelMetadata<T extends Entity, K extends keyof T> {
  public set columns(columns: readonly Column[]) {
    this._columns = columns;
    this.columnsByColumnName = {};
    this.columnsByPropertyName = {} as ColumnsByPropertyName<T, K>;

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

  public get createDateColumns(): ReadonlyArray<Column> {
    return this._createDateColumns;
  }

  public get updateDateColumns(): ReadonlyArray<Column> {
    return this._updateDateColumns;
  }

  public get versionColumns(): ReadonlyArray<Column> {
    return this._versionDateColumns;
  }

  public name: string;

  public type: EntityStatic<T>;

  public connection?: string;

  public tableName: string;

  public readonly: boolean;

  public columnsByColumnName: ColumnByStringId = {};

  public columnsByPropertyName: ColumnsByPropertyName<T, K> = {} as ColumnsByPropertyName<T, K>;

  private _columns: readonly Column[] = [];

  private _primaryKeyColumn: Column | undefined;

  private _createDateColumns: Column[] = [];

  private _updateDateColumns: Column[] = [];

  private _versionDateColumns: Column[] = [];

  public constructor({
    name,
    type,
    connection,
    tableName,
    readonly = false,
  }: ModelMetadataOptions<T>) {
    this.name = name;
    this.type = type;
    this.connection = connection;
    this.tableName = tableName || _.snakeCase(name);
    this.readonly = readonly;
  }
}
