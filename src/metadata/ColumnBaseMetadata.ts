export interface ColumnBaseMetadataOptions {
  /**
   * Name of class with @table decorator
   */
  target: string;
  /**
   * Column name in the database
   */
  name: string;
  /**
   * Class property to which the column is applied
   */
  propertyName: string;
  /**
   * Indicates if a value is required for creates.
   */
  required?: boolean;
  /**
   * Indicates if column is inserted by default. Default is true
   */
  insert?: boolean;
  /**
   * Indicates if column value is updated by "save" operation. Default is true
   */
  update?: boolean;
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
}

export abstract class ColumnBaseMetadata {
  /**
   * Name of class with @table decorator
   */
  public target: string;

  /**
   * Column name in the database
   */
  public name: string;

  /**
   * Class property to which the column is applied
   */
  public propertyName: string;

  /**
   * Indicates if a value is required for creates.
   */
  public required: boolean;

  /**
   * Indicates if column is inserted by default. Default is true
   */
  public insert: boolean;

  /**
   * Indicates if column value is updated by "save" operation. Default is true
   */
  public update: boolean;

  /**
   * Indicates if this column is a primary key.
   * Same can be achieved when @primaryColumn decorator is used
   */
  public primary: boolean;

  /**
   * Value will be equal to `new Date()` when the row is inserted into the table
   * Same can be achieved when @createDateColumn decorator is used
   */
  public createDate: boolean;

  /**
   * Value will be equal to `new Date()` when the row is updated
   * Same can be achieved when @updateDateColumn decorator is used
   */
  public updateDate: boolean;

  /**
   * Value will be set to 1 when the row is inserted. Value will be incremented by one when the row is updated
   * Same can be achieved when @versionColumn decorator is used
   */
  public version: boolean;

  protected constructor({
    target,
    name,
    propertyName,
    required = false,
    insert = true,
    update = true,
    primary = false,
    createDate = false,
    updateDate = false,
    version = false,
  }: ColumnBaseMetadataOptions) {
    this.target = target;
    this.name = name;
    this.propertyName = propertyName;
    this.required = required;
    this.insert = insert;
    this.update = update;
    this.primary = primary;
    this.createDate = createDate;
    this.updateDate = updateDate;
    this.version = version;
  }
}
