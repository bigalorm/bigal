import * as _ from 'lodash';
import 'reflect-metadata';
import { getMetadataStorage } from '../metadata';
import { ColumnCollectionOptions } from './ColumnCollectionOptions';
import { ColumnModelOptions } from './ColumnModelOptions';
import { ColumnTypeOptions } from './ColumnTypeOptions';
import { ColumnCollectionMetadata } from '../metadata/ColumnCollectionMetadata';
import { ColumnModelMetadata } from '../metadata/ColumnModelMetadata';
import { ColumnTypeMetadata } from '../metadata/ColumnTypeMetadata';

type ColumnOptions = ColumnTypeOptions | ColumnCollectionOptions | ColumnModelOptions;

export function column(): Function;
export function column(options: ColumnOptions): Function;
export function column(dbColumnName: string, options: ColumnOptions): Function;
export function column(dbColumnNameOrOptions?: string | ColumnOptions, options?: ColumnOptions): Function {
  return function columnDecorator(object: Object, propertyName: string) {
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
      dbColumnName = _.snakeCase(propertyName);
    }

    const metadataStorage = getMetadataStorage();

    const columnCollectionOptions = options as ColumnCollectionOptions;

    if (columnCollectionOptions.collection) {
      metadataStorage.columns.push(new ColumnCollectionMetadata({
        entity: object.constructor.name,
        name: dbColumnName,
        propertyName,
        required: columnCollectionOptions.required,
        collection: columnCollectionOptions.collection,
        via: columnCollectionOptions.via,
        through: columnCollectionOptions.through,
      }));

      return;
    }

    const columnModelOptions = options as ColumnModelOptions;
    if (columnModelOptions.model) {
      metadataStorage.columns.push(new ColumnModelMetadata({
        entity: object.constructor.name,
        name: dbColumnName,
        propertyName,
        required: columnModelOptions.required,
        model: columnModelOptions.model,
      }));

      return;
    }

    const columnTypeOptions = options as ColumnTypeOptions;
    metadataStorage.columns.push(new ColumnTypeMetadata({
      entity: object.constructor.name,
      name: dbColumnName,
      propertyName,
      required: columnTypeOptions.required,
      type: columnTypeOptions.type,
    }));
  };
}
