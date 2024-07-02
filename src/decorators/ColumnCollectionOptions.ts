import type { ColumnBaseOptions } from './ColumnBaseOptions.js';

export interface ColumnCollectionOptions extends ColumnBaseOptions {
  /**
   * Type of the items in the collection
   */
  collection: string | (() => string);

  /**
   * Property name of the on the collection item type
   */
  via: string;

  /**
   * Name of the junction table for multi-multi associations
   */
  through?: string | (() => string);
}
