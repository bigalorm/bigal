import type { ColumnBaseOptions } from './ColumnBaseOptions';

export interface ColumnTypeOptions extends ColumnBaseOptions {
  /**
   * Type of the column
   */
  type: 'array' | 'binary' | 'boolean' | 'boolean[]' | 'date' | 'datetime' | 'float' | 'float[]' | 'integer' | 'integer[]' | 'json' | 'string' | 'string[]';
  /**
   * Default database value
   */
  defaultsTo?: boolean[] | number[] | string[] | boolean | number | string | (() => Date | Record<string, unknown> | boolean | number | string) | [];
  /**
   * Array of possible enumerated values
   */
  enum?: string[];
}
