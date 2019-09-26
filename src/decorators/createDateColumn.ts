import _ from 'lodash';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
  ColumnTypeMetadata,
} from '../metadata';
import { ColumnTypeOptions } from './ColumnTypeOptions';

type ReturnFunctionType = (object: object, propertyName: string) => void;

export function createDateColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnNameOrOptions?: string | ColumnTypeOptions, options?: ColumnTypeOptions): ReturnFunctionType {
  return function createDateColumnDecorator(object: object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    let dbColumnName;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      dbColumnName = _.snakeCase(propertyName);
      // eslint-disable-next-line no-param-reassign
      options = dbColumnNameOrOptions;
    }

    if (dbColumnNameOrOptions) {
      if (!options) {
        // eslint-disable-next-line no-param-reassign
        options = {} as ColumnTypeOptions;
      }

      metadataStorage.columns.push(new ColumnTypeMetadata({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        createDate: true,
        required: options.required,
        type: options.type,
      }));
    } else {
      metadataStorage.columnModifiers.push({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        createDate: true,
        required: options ? options.required : undefined,
        type: options? options.type : undefined,
      } as ColumnModifierMetadata);
    }
  };
}
