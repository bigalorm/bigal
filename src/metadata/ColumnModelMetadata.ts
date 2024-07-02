import type { ColumnBaseMetadataOptions } from './ColumnBaseMetadata.js';
import { ColumnBaseMetadata } from './ColumnBaseMetadata.js';

export interface ColumnModelMetadataOptions extends ColumnBaseMetadataOptions {
  /**
   * Name of the model represented by this column id
   */
  model: string | (() => string);
}

export class ColumnModelMetadata extends ColumnBaseMetadata {
  private _modelString?: string;

  private _modelFn?: () => string;

  /**
   * Name of the model represented by this column id
   */
  public get model(): string {
    if (this._modelString) {
      return this._modelString;
    }

    if (!this._modelFn) {
      throw new Error(`Unable to determine model type for ${this.target}#${this.propertyName}`);
    }

    // Need to defer evaluation until runtime to avoid cyclical dependency issues.
    this._modelString = this._modelFn();
    return this._modelString;
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

    if (typeof model === 'string') {
      this._modelString = model;
    } else {
      this._modelFn = model;
    }
  }
}
