import { Entity } from '../../src/index.js';
import { primaryColumn } from '../../src/decorators/index.js';

export abstract class ModelBase extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;
}
