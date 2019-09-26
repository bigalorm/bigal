import _ from 'lodash';
import 'reflect-metadata';
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
        createDate: true,
        required: options.required,
        type: options.type,
      }));
    } else {
      const metadataStorage = getMetadataStorage();
      metadataStorage.columnModifiers.push({
        createDate: true,
        target: object.constructor.name,
        propertyName,
      } as ColumnModifierMetadata);
    }
  };
}
