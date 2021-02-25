import { Entity } from '../../src';
import { primaryColumn } from '../../src/decorators';

export abstract class ModelBase extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;
}
