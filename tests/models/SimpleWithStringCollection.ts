import { column, table } from '../../src';

import { ModelBase } from './ModelBase';

@table({
  name: 'simple',
})
export class SimpleWithStringCollection extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    defaultsTo: [],
    type: 'string[]',
    name: 'other_ids',
  })
  public otherIds!: string[];
}
