import { ColumnBaseMetadata, ColumnBaseMetadataOptions } from './ColumnBaseMetadata';

export interface ColumnTypeMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Type of sql column
   */
  type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
  /**
   * Default database value
   */
  defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | object) | [];
  /**
   * Array of possible enumerated values
   */
  enum?: string[];
}

export class ColumnTypeMetadata extends ColumnBaseMetadata {
  /**
   * Type of the column
   */
  public type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
  /**
   * Default database value
   */
  public defaultsTo?: string | string[] | number | number[] | boolean | boolean[] | (() => string | number | boolean | Date | object) | [];
  /**
   * Array of possible enumerated values
   */
  public enum?: string[];

  public constructor(options: ColumnTypeMetadataOptions) {
    super({
      target: options.target,
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

    this.type = options.type;
    this.defaultsTo = options.defaultsTo;
    this.enum = options.enum;
  }
}
