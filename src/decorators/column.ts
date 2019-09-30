import * as _ from 'lodash';
import { ColumnCollectionOptions } from './ColumnCollectionOptions';
import { ColumnModelOptions } from './ColumnModelOptions';
import { ColumnTypeOptions } from './ColumnTypeOptions';
import {
  getMetadataStorage,
  ColumnCollectionMetadata,
  ColumnModelMetadata,
  ColumnTypeMetadata,
} from '../metadata';

type ColumnOptions = ColumnTypeOptions | ColumnCollectionOptions | ColumnModelOptions;
type ReturnFunctionType = (object: object, propertyName: string) => void;

export function column(options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnName: string, options?: ColumnOptions): ReturnFunctionType;
export function column(dbColumnNameOrOptions?: string | ColumnOptions, options?: ColumnOptions): ReturnFunctionType {
  return function columnDecorator(object: object, propertyName: string) {
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

    if (columnCollectionOptions.collection) {
      let through: string | undefined;
      if (columnCollectionOptions.through) {
        if (typeof columnCollectionOptions.through === 'string') {
          through = columnCollectionOptions.through;
        } else {
          through = columnCollectionOptions.through.name;
        }
      }

      metadataStorage.columns.push(new ColumnCollectionMetadata({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        required: columnCollectionOptions.required,
        collection: typeof columnCollectionOptions.collection === 'string' ? columnCollectionOptions.collection : columnCollectionOptions.collection.name,
        via: columnCollectionOptions.via,
        through,
      }));

      return;
    }

    const columnModelOptions = options as ColumnModelOptions;
    if (columnModelOptions.model) {
      metadataStorage.columns.push(new ColumnModelMetadata({
        target: object.constructor.name,
        name: dbColumnName,
        propertyName,
        required: columnModelOptions.required,
        model: typeof columnModelOptions.model === 'string' ? columnModelOptions.model : columnModelOptions.model.constructor.name,
      }));

      return;
    }

    const columnTypeOptions = options as ColumnTypeOptions;
    metadataStorage.columns.push(new ColumnTypeMetadata({
      target: object.constructor.name,
      name: dbColumnName,
      propertyName,
      required: columnTypeOptions.required,
      type: columnTypeOptions.type,
      defaultsTo: columnTypeOptions.defaultsTo,
      enum: columnTypeOptions.enum,
    }));
  };
}
