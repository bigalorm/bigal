import { column, table } from '../../src';

import { ModelBase } from './ModelBase';

@table({
  name: 'some_other_table',
})
export class RequiredPropertyWithDefaultValueFunction extends ModelBase {
  @column({
    type: 'string',
    required: true,
    defaultsTo: () => 'foobar',
  })
  public foo!: string;

  @column({
    type: 'string',
  })
  public bar?: string;
}
