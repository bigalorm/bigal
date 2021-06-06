import { column, createDateColumn, table } from '../../src';

import { ModelBase } from './ModelBase';

@table({
  name: 'simple',
})
export class SimpleWithCreatedAt extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @createDateColumn()
  public createdAt!: Date;
}
