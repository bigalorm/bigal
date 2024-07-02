import type { ColumnBaseOptions } from './ColumnBaseOptions.js';

export interface ColumnModelOptions extends ColumnBaseOptions {
  /**
   * Type of the entity represented by this column id
   */
  model: string | (() => string);
}
