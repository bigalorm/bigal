import { column, table, updateDateColumn } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  name: 'simple',
})
export class SimpleWithUpdatedAt extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @updateDateColumn()
  public updatedAt!: Date;
}
