import type { ColumnBaseOptions } from './ColumnBaseOptions.js';

export interface ColumnTypeOptions extends ColumnBaseOptions {
  /**
   * Type of the column
   */
  type: 'array' | 'binary' | 'boolean' | 'boolean[]' | 'date' | 'datetime' | 'float' | 'float[]' | 'integer' | 'integer[]' | 'json' | 'string' | 'string[]' | 'uuid' | 'uuid[]' | 'vector';
  /**
   * Default database value
   */
  defaultsTo?: boolean[] | number[] | string[] | boolean | number | string | (() => Date | Record<string, unknown> | boolean | number | string) | [];
  /**
   * Number of dimensions for the column. Informational only - BigAl does not issue DDL
   *
   * Applies to types: vector
   */
  dimensions?: number;
  /**
   * Array of possible enumerated values
   */
  enum?: readonly string[];
  /**
   * If set, enforces a maximum length check on the column
   *
   * Applies to types: string | string[]
   */
  maxLength?: number;
}
