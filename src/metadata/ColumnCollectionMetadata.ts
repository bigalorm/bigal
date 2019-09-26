import { ColumnBaseMetadata, ColumnBaseMetadataOptions } from './ColumnBaseMetadata';

export interface ColumnCollectionMetadataOptions extends ColumnBaseMetadataOptions {
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

export class ColumnCollectionMetadata extends ColumnBaseMetadata {
  /**
   * Type of the items in the collection
   */
  public collection: string;

  /**
   * Property name of the on the collection item type
   */
  public via: string;

  /**
   * Name of the junction table for multi-multi associations
   */
  public through?: string;

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
    collection,
    via,
    through,
  }: ColumnCollectionMetadataOptions) {
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

    this.collection = collection;
    this.via = via;
    this.through = through;
  }
}
