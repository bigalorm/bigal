import { ColumnBaseOptions } from './ColumnBaseOptions';
import { Entity, EntityStatic } from '../Entity';

export interface ColumnCollectionOptions extends ColumnBaseOptions {
  /**
   * Type of the items in the collection
   */
  collection: string | EntityStatic<Entity>;

  /**
   * Property name of the on the collection item type
   */
  via: string;

  /**
   * Name of the junction table for multi-multi associations
   */
  through?: string | EntityStatic<Entity>;
}
