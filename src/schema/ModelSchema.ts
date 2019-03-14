import {
  CollectionAttribute,
  ModelAttribute,
  TypeAttribute,
} from './attributes';
import { Entity } from '../Entity';

type AnyFunction = () => any;

export interface ModelSchema {
  globalId: string;
  tableName?: string;
  connection?: string;
  autoCreatedAt?: boolean;
  autoUpdatedAt?: boolean;
  attributes: {
    [index: string]: CollectionAttribute | ModelAttribute | TypeAttribute | AnyFunction;
  };
  beforeCreate?(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>>;
  beforeUpdate?(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>>;
}
