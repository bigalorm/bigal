import { ColumnBaseMetadata, ColumnBaseMetadataOptions } from './ColumnBaseMetadata';

export interface ColumnTypeMetadataOptions extends ColumnBaseMetadataOptions {
  type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';
}

export class ColumnTypeMetadata extends ColumnBaseMetadata {
  /**
   * Type of the column
   */
  public type: 'string' | 'integer' | 'float' | 'date' | 'datetime' | 'boolean' | 'array' | 'string[]' | 'integer[]' | 'float[]' | 'boolean[]' | 'json' | 'binary';

  public constructor({
    entity,
    name,
    propertyName,
    required,
    insert,
    update,
    primary,
    createDate,
    updateDate,
    version,
    type,
  }: ColumnTypeMetadataOptions) {
    super({
      entity,
      name,
      propertyName,
      required,
      insert,
      update,
      primary,
      createDate,
      updateDate,
      version,
    });

    this.type = type;
  }
}
