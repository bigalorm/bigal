import _ from 'lodash';
import {
  getMetadataStorage, //
  ColumnModifierMetadata,
  ColumnTypeMetadata,
} from '../metadata';
import { ColumnTypeOptions } from './ColumnTypeOptions';

// eslint-disable-next-line @typescript-eslint/ban-types
type ReturnFunctionType = (object: object, propertyName: string) => void;

export function createDateColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnNameOrOptions?: string | ColumnTypeOptions, options?: ColumnTypeOptions): ReturnFunctionType {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function createDateColumnDecorator(object: object, propertyName: string): void {
    const metadataStorage = getMetadataStorage();
    let dbColumnName: string | undefined;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      // eslint-disable-next-line no-param-reassign
      options = dbColumnNameOrOptions;
    }

    if (dbColumnNameOrOptions) {
      if (!options) {
        // eslint-disable-next-line no-param-reassign
        options = {} as ColumnTypeOptions;
      }

      if (!dbColumnName) {
        dbColumnName = options.name || _.snakeCase(propertyName);
      }

      metadataStorage.columns.push(
        new ColumnTypeMetadata({
          target: object.constructor.name,
          name: dbColumnName,
          propertyName,
          createDate: true,
          required: options.required,
          type: options.type,
        }),
      );
    } else {
      metadataStorage.columnModifiers.push({
        target: object.constructor.name,
        name: dbColumnName || _.snakeCase(propertyName),
        propertyName,
        createDate: true,
        required: options ? options.required : undefined,
        type: options ? options.type : 'datetime',
      } as ColumnModifierMetadata);
    }
  };
}
