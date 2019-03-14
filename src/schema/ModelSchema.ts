import {
  CollectionAttribute,
  ModelAttribute,
  TypeAttribute,
} from './attributes';

type AnyFunction = () => any;
interface Values { [index: string]: any; }

export interface ModelSchema {
  globalId?: string;
  tableName?: string;
  connection?: string;
  autoCreatedAt?: boolean;
  autoUpdatedAt?: boolean;
  attributes: {
    [index: string]: CollectionAttribute | ModelAttribute | TypeAttribute | AnyFunction;
  };
  beforeCreate?: (values: Values) => Values | Promise<Values>;
  beforeUpdate?: (values: Values) => Values | Promise<Values>;
}

export interface ModelSchemasByGlobalId {
  [index: string]: ModelSchema;
}
