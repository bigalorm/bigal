import { ColumnBaseOptions } from './ColumnBaseOptions';

export interface ColumnTypeOptions extends ColumnBaseOptions {
  /**
   * Type of the column
   */
  type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
  /**
   * Default database value
   */
  defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | Record<string, unknown>) | [];
  /**
   * Array of possible enumerated values
   */
  enum?: string[];
}
