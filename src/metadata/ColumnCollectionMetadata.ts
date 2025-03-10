import type { ColumnBaseMetadataOptions } from './ColumnBaseMetadata.js';
import { ColumnBaseMetadata } from './ColumnBaseMetadata.js';

export interface ColumnCollectionMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Type of the items in the collection
   */
  collection: string | (() => string);
  /**
   * Property name of the on the collection item type
   */
  via: string;
  /**
   * Name of the junction table for multi-multi associations
   */
  through?: string | (() => string);
}

export class ColumnCollectionMetadata extends ColumnBaseMetadata {
  private _collectionString?: string;

  private _collectionFn?: () => string;

  private _throughString?: string;

  private _throughFn?: () => string;

  /**
   * Type of the items in the collection
   * @returns Name of collection
   */
  public get collection(): string {
    if (this._collectionString) {
      return this._collectionString;
    }

    if (!this._collectionFn) {
      throw new Error(`Unable to determine collection type for ${this.target}#${this.propertyName}`);
    }

    // Need to defer evaluation until runtime to avoid cyclical dependency issues.
    this._collectionString = this._collectionFn();
    return this._collectionString;
  }

  /**
   * Property name of the on the collection item type
   */
  public via: string;

  /**
   * Name of the junction table for multi-multi associations
   * @returns Name of junction table
   */
  public get through(): string | undefined {
    if (this._throughString) {
      return this._throughString;
    }

    if (this._throughFn) {
      this._throughString = this._throughFn();
      return this._throughString;
    }

    return undefined;
  }

  public constructor({
    target, //
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

    this.via = via;

    if (typeof collection === 'string') {
      this._collectionString = collection;
    } else {
      this._collectionFn = collection;
    }

    if (typeof through === 'string') {
      this._throughString = through;
    } else if (through) {
      this._throughFn = through;
    }
  }
}
