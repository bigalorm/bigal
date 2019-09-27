import {
  createDateColumn,
  primaryColumn,
} from '../../src/decorators';

export abstract class ModelBase {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @createDateColumn()
  public createdAt!: Date;
}
