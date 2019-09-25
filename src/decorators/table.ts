import _ from 'lodash';
import 'reflect-metadata';
import {
  getMetadataStorage,
  ModelMetadata,
} from '../metadata';
import { TableOptions } from './TableOptions';
import { Entity, EntityStatic } from '../Entity';

type ReturnFunctionType<T extends Entity = Entity> = (object: EntityStatic<T>) => void;

export function table(options?: TableOptions): ReturnFunctionType;
export function table(dbName: string, options: TableOptions): ReturnFunctionType;
export function table(dbNameOrTableOptions?: string | TableOptions, options?: TableOptions): ReturnFunctionType {
  return function tableDecorator<T extends Entity>(classObject: EntityStatic<T>) {
    const className = classObject.constructor.name;
    if (!dbNameOrTableOptions) {
      // tslint:disable-next-line:no-parameter-reassignment
      dbNameOrTableOptions = _.snakeCase(className);
    }

    let dbTableName: string | undefined;
    if (typeof dbNameOrTableOptions === 'string') {
      dbTableName = dbNameOrTableOptions;
    } else {
      // tslint:disable-next-line:no-parameter-reassignment
      options = dbNameOrTableOptions;
    }

    if (!options) {
      // tslint:disable-next-line:no-parameter-reassignment
      options = {} as TableOptions;
    }

    if (!options.name) {
      options.name = dbTableName || _.snakeCase(className);
    }

    const metadataStorage = getMetadataStorage();
    const modelMetadata = new ModelMetadata({
      name: className,
      type: classObject,
      tableName: options.name,
      readonly: options.readonly || false,
      connection: options.connection,
    });

    metadataStorage.models.push(modelMetadata);
  };
}
