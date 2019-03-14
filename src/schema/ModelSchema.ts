import { Entity } from '../Entity';
import { Attributes } from './attributes';

export interface ModelSchema {
  globalId: string;
  tableName?: string;
  connection?: string;
  autoCreatedAt?: boolean;
  autoUpdatedAt?: boolean;
  attributes: Attributes;
  beforeCreate?(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>>;
  beforeUpdate?(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>>;
}
