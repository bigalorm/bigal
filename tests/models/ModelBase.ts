import { primaryColumn } from '../../src/decorators/index.js';
import { Entity } from '../../src/index.js';

export abstract class ModelBase extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;
}
