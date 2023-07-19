import _ from 'lodash';

import type { Entity, EntityStatic } from '../Entity';
import { ModelMetadata, getMetadataStorage } from '../metadata';

import type { TableOptions } from './TableOptions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReturnFunctionType = (object: any) => void;

export function table(options?: TableOptions): ReturnFunctionType;
export function table(dbName: string, options: TableOptions): ReturnFunctionType;
export function table<T extends Entity>(dbNameOrTableOptions?: TableOptions | string, options?: TableOptions): ReturnFunctionType {
  return function tableDecorator(classObject: EntityStatic<T>): void {
    const className = classObject.name;

    let dbTableName: string | undefined;
    if (typeof dbNameOrTableOptions === 'string') {
      dbTableName = dbNameOrTableOptions;
    } else {
      // eslint-disable-next-line no-param-reassign
      options = dbNameOrTableOptions;
    }

    if (!options) {
      // eslint-disable-next-line no-param-reassign
      options = {} as TableOptions;
    }

    if (!options.name) {
      // eslint-disable-next-line no-param-reassign
      options.name = dbTableName ?? _.snakeCase(className);
    }

    const metadataStorage = getMetadataStorage<T>();
    const modelMetadata = new ModelMetadata({
      name: className,
      type: classObject,
      tableName: options.name,
      readonly: options.readonly ?? false,
      connection: options.connection,
    });

    metadataStorage.models.push(modelMetadata);
  };
}
