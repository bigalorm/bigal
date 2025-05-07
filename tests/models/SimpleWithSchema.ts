import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  schema: 'foo',
  name: 'simple',
})
export class SimpleWithSchema extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;
}
