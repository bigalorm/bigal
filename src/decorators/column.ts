import * as _ from 'lodash';
import { ColumnCollectionOptions } from './ColumnCollectionOptions';
import { ColumnModelOptions } from './ColumnModelOptions';
import { ColumnTypeOptions } from './ColumnTypeOptions';
import {
  getMetadataStorage, //
  ColumnCollectionMetadata,
  ColumnModelMetadata,
  ColumnTypeMetadata,
} from '../metadata';

type ColumnOptions = ColumnTypeOptions | ColumnCollectionOptions | ColumnModelOptions;
// eslint-disable-next-line @typescript-eslint/ban-types
type ReturnFunctionType = (object: object, propertyName: string) => void;

export function column(options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnName: string, options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnNameOrOptions?: string | ColumnOptions, options?: ColumnOptions): ReturnFunctionType {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function columnDecorator(object: object, propertyName: string): void {
    if (!dbColumnNameOrOptions) {
      // eslint-disable-next-line no-param-reassign
      dbColumnNameOrOptions = _.snakeCase(propertyName);
    }

    let dbColumnName: string | undefined;
    if (typeof dbColumnNameOrOptions === 'string') {
      dbColumnName = dbColumnNameOrOptions;
    } else {
      // eslint-disable-next-line no-param-reassign
      options = dbColumnNameOrOptions;
    }

    if (!options) {
      // eslint-disable-next-line no-param-reassign
      options = {} as ColumnTypeOptions;
    }

    if (!dbColumnName) {
      dbColumnName = options.name || _.snakeCase(propertyName);
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
      }),
    );
  };
}
