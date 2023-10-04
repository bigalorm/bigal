import _ from 'lodash';

import type { ColumnModifierMetadata } from '../metadata';
import { ColumnTypeMetadata, getMetadataStorage } from '../metadata';
import type { ClassLike } from '../types';

import type { ColumnTypeOptions } from './ColumnTypeOptions';

type ReturnFunctionType = (object: ClassLike, propertyName: string) => void;

export function updateDateColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function updateDateColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function updateDateColumn(dbColumnNameOrOptions?: ColumnTypeOptions | string, options?: ColumnTypeOptions): ReturnFunctionType {
  return function updateDateColumnDecorator(object: ClassLike, propertyName: string): void {
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

      const metadataStorage = getMetadataStorage();
      metadataStorage.columns.push(
        new ColumnTypeMetadata({
          target: object.constructor.name,
          name: dbColumnName,
          propertyName,
          updateDate: true,
          required: options.required,
          type: options.type,
        }),
      );
    } else {
      const metadataStorage = getMetadataStorage();
      metadataStorage.columnModifiers.push({
        target: object.constructor.name,
        name: dbColumnName ?? _.snakeCase(propertyName),
        propertyName,
        updateDate: true,
        required: options ? options.required : undefined,
        type: options ? options.type : 'datetime',
      } as ColumnModifierMetadata);
    }
  };
}
