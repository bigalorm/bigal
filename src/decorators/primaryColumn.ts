import _ from 'lodash';

import type { ColumnModifierMetadata } from '../metadata/index.js';
import { ColumnModelMetadata, ColumnTypeMetadata, getMetadataStorage } from '../metadata/index.js';
import type { ClassLike } from '../types/index.js';

import type { ColumnModelOptions } from './ColumnModelOptions.js';
import type { ColumnTypeOptions } from './ColumnTypeOptions.js';

type ColumnOptions = ColumnModelOptions | ColumnTypeOptions;

type ReturnFunctionType = (object: ClassLike, propertyName: string) => void;

export function primaryColumn(options?: ColumnOptions): ReturnFunctionType;
export function primaryColumn(dbColumnName: string, options?: ColumnOptions): ReturnFunctionType;
export function primaryColumn(dbColumnNameOrOptions?: ColumnOptions | string, options?: ColumnOptions): ReturnFunctionType {
  return function primaryColumnDecorator(object: ClassLike, propertyName: string): void {
    let dbColumnName: string | undefined;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      options = dbColumnNameOrOptions;
    }

    if (dbColumnNameOrOptions) {
      if (!options) {
        options = {} as ColumnTypeOptions;
      }

      if (!dbColumnName) {
        dbColumnName = options.name ?? _.snakeCase(propertyName);
      }

      const { type } = options as ColumnTypeOptions;
      const { model } = options as ColumnModelOptions;

      const metadataStorage = getMetadataStorage();

      if (model) {
        metadataStorage.columns.push(
          new ColumnModelMetadata({
            target: object.constructor.name,
            name: dbColumnName,
            propertyName,
            primary: true,
            required: options.required,
            model,
          }),
        );
      } else {
        metadataStorage.columns.push(
          new ColumnTypeMetadata({
            target: object.constructor.name,
            name: dbColumnName,
            propertyName,
            primary: true,
            required: options.required,
            type,
          }),
        );
      }
    } else {
      const metadataStorage = getMetadataStorage();
      metadataStorage.columnModifiers.push({
        target: object.constructor.name,
        name: dbColumnName ?? _.snakeCase(propertyName),
        propertyName,
        primary: true,
        required: options ? options.required : undefined,
        type: options ? (options as ColumnTypeOptions).type : undefined,
        model: options ? (options as ColumnModelOptions).model : undefined,
      } as ColumnModifierMetadata);
    }
  };
}
