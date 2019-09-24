import { ColumnBaseOptions } from './ColumnBaseOptions';

export interface ColumnTypeOptions extends ColumnBaseOptions {
  /**
   * Type of the column
   */
  type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
}
