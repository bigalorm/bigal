import { column, table } from '../../src/decorators';

import { ModelBase } from './ModelBase';

@table({
  name: 'some_table',
})
export class RequiredPropertyWithDefaultValue extends ModelBase {
  @column({
    type: 'string',
    required: true,
    defaultsTo: 'foobar',
  })
  public foo!: string;

  @column({
    type: 'string',
  })
  public bar?: string;
}
