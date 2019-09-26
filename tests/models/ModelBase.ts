import {
  createDateColumn,
  primaryColumn,
  updateDateColumn,
} from '../../src/decorators';

export abstract class ModelBase {
  @primaryColumn()
  public id!: number;

  @createDateColumn()
  public createdAt!: Date;

  @updateDateColumn()
  public updatedAt!: Date;
}
