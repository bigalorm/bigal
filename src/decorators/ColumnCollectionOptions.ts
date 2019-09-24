import { ColumnBaseOptions } from './ColumnBaseOptions';

export interface ColumnCollectionOptions extends ColumnBaseOptions {
  /**
   * Type of the items in the collection
   */
  collection: string;

  /**
   * Property name of the on the collection item type
   */
  via: string;

  /**
   * Name of the junction table for multi-multi associations
   */
  through?: string;
}
