import _ from 'lodash';
import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
  ColumnTypeMetadata,
} from '../metadata';
import { ColumnTypeOptions } from './ColumnTypeOptions';

type ReturnFunctionType = (object: object, propertyName: string) => void;

export function primaryColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function primaryColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function primaryColumn(dbColumnNameOrOptions?: string | ColumnTypeOptions, options?: ColumnTypeOptions): ReturnFunctionType {
  return function primaryColumnDecorator(object: object, propertyName: string) {
    if (dbColumnNameOrOptions) {
      let dbColumnName;
      if (typeof dbColumnNameOrOptions === 'string') {
        dbColumnName = dbColumnNameOrOptions;
      } else {
        dbColumnName = _.snakeCase(propertyName);
        // tslint:disable-next-line:no-parameter-reassignment
        options = dbColumnNameOrOptions;
      }

      if (!options) {
        // tslint:disable-next-line:no-parameter-reassignment
        options = {} as ColumnTypeOptions;
      }

      const metadataStorage = getMetadataStorage();
      metadataStorage.columns.push(new ColumnTypeMetadata({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        primary: true,
        required: options.required,
        type: options.type,
      }));
    } else {
      const metadataStorage = getMetadataStorage();
      metadataStorage.columnModifiers.push({
        primary: true,
        target: object.constructor.name,
        propertyName,
      } as ColumnModifierMetadata);
    }
  };
}
