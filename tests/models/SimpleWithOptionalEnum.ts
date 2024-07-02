import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  name: 'simple',
})
export class SimpleWithOptionalEnum extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    enum: ['Foo', 'Bar', 'Foobar'],
    type: 'string',
  })
  public status?: 'Bar' | 'Foo' | 'Foobar';
}
