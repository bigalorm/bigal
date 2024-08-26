import _ from 'lodash';

import { ColumnCollectionMetadata, ColumnModelMetadata, ColumnTypeMetadata, getMetadataStorage } from '../metadata/index.js';
import type { ClassLike } from '../types/index.js';

import type { ColumnCollectionOptions } from './ColumnCollectionOptions.js';
import type { ColumnModelOptions } from './ColumnModelOptions.js';
import type { ColumnTypeOptions } from './ColumnTypeOptions.js';

type ColumnOptions = ColumnCollectionOptions | ColumnModelOptions | ColumnTypeOptions;
type ReturnFunctionType = (object: ClassLike, propertyName: string) => void;

export function column(options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnName: string, options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnNameOrOptions?: ColumnOptions | string, options?: ColumnOptions): ReturnFunctionType {
  return function columnDecorator(object: ClassLike, propertyName: string): void {
    if (!dbColumnNameOrOptions) {
      dbColumnNameOrOptions = _.snakeCase(propertyName);
    }

    let dbColumnName: string | undefined;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      options = dbColumnNameOrOptions;
    }

    if (!options) {
      options = {} as ColumnTypeOptions;
    }

    if (!dbColumnName) {
      dbColumnName = options.name ?? _.snakeCase(propertyName);
    }

    const metadataStorage = getMetadataStorage();

    const columnCollectionOptions = options as ColumnCollectionOptions;

    if (columnCollectionOptions.collection || columnCollectionOptions.via) {
      // NOTE: https://github.com/Microsoft/TypeScript/issues/4521
      if (!columnCollectionOptions.collection) {
        throw new Error('Unable to determine collection value. Please try specifying values as a strings to avoid circular dependency issues.');
      }

      metadataStorage.columns.push(
        new ColumnCollectionMetadata({
          target: object.constructor.name,
          name: dbColumnName,
          propertyName,
          required: columnCollectionOptions.required,
          collection: columnCollectionOptions.collection,
          through: columnCollectionOptions.through,
          via: columnCollectionOptions.via,
        }),
      );

      return;
    }

    const columnModelOptions = options as ColumnModelOptions;
    if (columnModelOptions.model) {
      metadataStorage.columns.push(
        new ColumnModelMetadata({
          target: object.constructor.name,
          name: dbColumnName,
          propertyName,
          required: columnModelOptions.required,
          model: columnModelOptions.model,
        }),
      );

      return;
    }

    const columnTypeOptions = options as ColumnTypeOptions;
    metadataStorage.columns.push(
      new ColumnTypeMetadata({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        required: columnTypeOptions.required,
        type: columnTypeOptions.type,
        defaultsTo: columnTypeOptions.defaultsTo,
        enum: columnTypeOptions.enum,
        maxLength: columnTypeOptions.maxLength,
      }),
    );
  };
}
