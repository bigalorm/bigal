import { ColumnBaseMetadata, ColumnBaseMetadataOptions } from './ColumnBaseMetadata';

export interface ColumnModelMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Name of the model represented by this column id
   */
  model: string;
}

export class ColumnModelMetadata extends ColumnBaseMetadata {
  /**
   * Name of the model represented by this column id
   */
  public model: string;

  public constructor({
    target,
    name,
    propertyName,
    required,
    insert,
    update,
    primary,
    createDate,
    updateDate,
    version,
    model,
  }: ColumnModelMetadataOptions) {
    super({
      target,
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

    this.model = model;
  }
}
