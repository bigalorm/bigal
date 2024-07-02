import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  name: 'simple',
})
export class SimpleWithJson extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    type: 'json',
  })
  public bar?: unknown;

  @column({
    type: 'json',
  })
  public keyValue?: Record<string, number>;
}
