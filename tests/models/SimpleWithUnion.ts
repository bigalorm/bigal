import { column, table } from '../../src';

import { ModelBase } from './ModelBase';

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
    enum: ['Foo', 'Bar', 'Foobar'],
    defaultsTo: 'Foo',
    type: 'string',
  })
  public status!: 'Bar' | 'Foo' | 'Foobar';
}
