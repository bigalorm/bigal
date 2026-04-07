import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

const STATUSES = ['Foo', 'Bar', 'Foobar'] as const;

@table({
  name: 'simple',
})
export class SimpleWithUnion extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    enum: STATUSES,
    defaultsTo: 'Foo',
    type: 'string',
  })
  public status!: 'Bar' | 'Foo' | 'Foobar';
}
