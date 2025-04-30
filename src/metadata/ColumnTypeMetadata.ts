import type { ColumnBaseMetadataOptions } from './ColumnBaseMetadata.js';
import { ColumnBaseMetadata } from './ColumnBaseMetadata.js';

export interface ColumnTypeMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Type of sql column
   */
  type: 'array' | 'binary' | 'boolean' | 'boolean[]' | 'date' | 'datetime' | 'float' | 'float[]' | 'integer' | 'integer[]' | 'json' | 'string' | 'string[]' | 'uuid' | 'uuid[]';
  /**
   * Default database value
   */
  defaultsTo?: boolean[] | number[] | string[] | boolean | number | string | (() => Date | Record<string, unknown> | boolean | number | string) | [];
  /**
   * Array of possible enumerated values
   */
  enum?: string[];
  /**
   * If set, enforces a maximum length check on the column
   *
   * Applies to types: string | string[]
   */
  maxLength?: number;
}

export class ColumnTypeMetadata extends ColumnBaseMetadata {
  /**
   * Type of the column
   */
  public type: 'array' | 'binary' | 'boolean' | 'boolean[]' | 'date' | 'datetime' | 'float' | 'float[]' | 'integer' | 'integer[]' | 'json' | 'string' | 'string[]' | 'uuid' | 'uuid[]';

  /**
   * Default database value
   */
  public defaultsTo?: boolean[] | number[] | string[] | boolean | number | string | (() => Date | Record<string, unknown> | boolean | number | string) | [];

  /**
   * Array of possible enumerated values
   */
  public enum?: string[];

  /**
   * If set, enforces a maximum length check on the column
   *
   * Applies to types: string | string[]
   */
  public maxLength?: number;

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
    this.maxLength = options.maxLength;
  }
}
