export interface ColumnModifierMetadata {
  /**
   * Name of class with @table decorator
   */
  target: string;
  /**
   * Column name in the database
   */
  name?: string;
  /**
   * Class property to which the column is applied
   */
  propertyName: string;
  /**
   * Indicates if a value is required for creates.
   */
  required?: boolean;
  /**
   * Indicates if this column is a primary key.
   * Same can be achieved when @primaryColumn decorator is used
   */
  primary?: boolean;
  /**
   * Value will be equal to `new Date()` when the row is inserted into the table
   * Same can be achieved when @createDateColumn decorator is used
   */
  createDate?: boolean;
  /**
   * Value will be equal to `new Date()` when the row is updated
   * Same can be achieved when @updateDateColumn decorator is used
   */
  updateDate?: boolean;
  /**
   * Value will be set to 1 when the row is inserted. Value will be incremented by one when the row is updated
   * Same can be achieved when @versionColumn decorator is used
   */
  version?: boolean;
  /**
   * Type of sql column
   */
  type?: 'array' | 'binary' | 'boolean' | 'boolean[]' | 'date' | 'datetime' | 'float' | 'float[]' | 'integer' | 'integer[]' | 'json' | 'string' | 'string[]';
  /**
   * Name of the model represented by this column id
   */
  model?: string | (() => string);
}
