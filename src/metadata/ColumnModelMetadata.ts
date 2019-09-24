import { ColumnBaseMetadata, ColumnBaseMetadataOptions } from './ColumnBaseMetadata';

export interface ColumnModelMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Type of the entity represented by this column id
   */
  model: string;

  /**
   * Indicates if this column is a primary key
   */
  primary?: boolean;

  /**
   * Default database value
   */
  defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | object) | [];

  /**
   * Array of possible enumerated values
   */
  enum?: string[];
}

export class ColumnModelMetadata extends ColumnBaseMetadata {
  /**
   * Type of the entity represented by this column id
   */
  public model: string;
  /**
   * Indicates if this column is a primary key
   */
  public primary?: boolean;
  /**
   * Default database value
   */
  public defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | object) | [];
  /**
   * Array of possible enumerated values
   */
  public enum?: string[];

  public constructor(options: ColumnModelMetadataOptions) {
    super({
      entity: options.entity,
      name: options.name,
      propertyName: options.propertyName,
      required: options.required,
      insert: options.insert,
      update: options.update,
      primary: options.primary,
      createDate: options.createDate,
      updateDate: options.updateDate,
      version: options.version,
    });

    this.model = options.model;
    this.primary = options.primary;
    this.defaultsTo = options.defaultsTo;
    this.enum = options.enum;
  }
}
