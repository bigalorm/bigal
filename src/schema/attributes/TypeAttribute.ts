import { BaseAttribute } from './BaseAttribute';

export interface TypeAttribute extends BaseAttribute {
  type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
  unique?: boolean;
  primaryKey?: boolean;
  defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | object) | [];
  enum?: string[];
}
