import { column, table, updateDateColumn } from '../../src/decorators';

import { ModelBase } from './ModelBase';

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
