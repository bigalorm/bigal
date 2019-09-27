import { ColumnBaseOptions } from './ColumnBaseOptions';
import { Entity, EntityStatic } from '../Entity';

export interface ColumnModelOptions extends ColumnBaseOptions {
  /**
   * Type of the entity represented by this column id
   */
  model: string | EntityStatic<Entity>;
}
