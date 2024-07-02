import { column, createDateColumn, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

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
