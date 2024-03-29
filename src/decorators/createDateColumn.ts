import _ from 'lodash';

import type { ColumnModifierMetadata } from '../metadata';
import { ColumnTypeMetadata, getMetadataStorage } from '../metadata';
import type { ClassLike } from '../types';

import type { ColumnTypeOptions } from './ColumnTypeOptions';

type ReturnFunctionType = (object: ClassLike, propertyName: string) => void;

export function createDateColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function createDateColumn(dbColumnNameOrOptions?: ColumnTypeOptions | string, options?: ColumnTypeOptions): ReturnFunctionType {
  return function createDateColumnDecorator(object: ClassLike, propertyName: string): void {
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
        dbColumnName = options.name ?? _.snakeCase(propertyName);
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
        name: dbColumnName ?? _.snakeCase(propertyName),
        propertyName,
        createDate: true,
        required: options ? options.required : undefined,
        type: options ? options.type : 'datetime',
      } as ColumnModifierMetadata);
    }
  };
}
