import * as _ from 'lodash';
import 'reflect-metadata';
import {
  getMetadataStorage,
  ModelMetadata,
} from '../metadata';
import { TableOptions } from './TableOptions';
import { Entity } from '../Entity';

export function table(): Function;
export function table(options: TableOptions): Function;
export function table(dbName: string, options: TableOptions): Function;
export function table(dbNameOrTableOptions?: string | TableOptions, options?: TableOptions): Function {
  return function tableDecorator(object: new() => Entity, className: string) {
    if (!dbNameOrTableOptions) {
      dbNameOrTableOptions = _.snakeCase(className);
    }

    let dbTableName: string | undefined;
    if (typeof dbNameOrTableOptions === 'string') {
      dbTableName = dbNameOrTableOptions;
    } else {
      options = dbNameOrTableOptions;
    }

    if (!options) {
      options = {} as TableOptions;
    }

    if (!options.name) {
      options.name = dbTableName || _.snakeCase(className);
    }

    const metadataStorage = getMetadataStorage();
    const modelMetadata = new ModelMetadata({
      name: className,
      type: object,
      tableName: options.name,
      readonly: options.readonly || false,
      connection: options.connection,
    });

    metadataStorage.models.push(modelMetadata);
  };
}
