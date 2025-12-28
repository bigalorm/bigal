import type { ColumnModifierMetadata } from '../metadata/index.js';
import { ColumnTypeMetadata, getMetadataStorage } from '../metadata/index.js';
import type { ClassLike } from '../types/index.js';
import { snakeCase } from '../utils/index.js';

import type { ColumnTypeOptions } from './ColumnTypeOptions.js';

type ReturnFunctionType = (object: ClassLike, propertyName: string) => void;

export function updateDateColumn(options?: ColumnTypeOptions): ReturnFunctionType;
export function updateDateColumn(dbColumnName: string, options?: ColumnTypeOptions): ReturnFunctionType;
export function updateDateColumn(dbColumnNameOrOptions?: ColumnTypeOptions | string, options?: ColumnTypeOptions): ReturnFunctionType {
  return function updateDateColumnDecorator(object: ClassLike, propertyName: string): void {
    let dbColumnName: string | undefined;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      options = dbColumnNameOrOptions;
    }

    if (dbColumnNameOrOptions) {
      options ??= {} as ColumnTypeOptions;
      dbColumnName ??= options.name ?? snakeCase(propertyName);

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
        name: dbColumnName ?? snakeCase(propertyName),
        propertyName,
        updateDate: true,
        required: options ? options.required : undefined,
        type: options ? options.type : 'datetime',
      } as ColumnModifierMetadata);
    }
  };
}
