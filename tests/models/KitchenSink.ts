import { column, table } from '../../src/decorators/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  name: 'kitchen_sink',
})
export class KitchenSink extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    type: 'integer',
    name: 'int_column',
  })
  public intColumn?: number;

  @column({
    type: 'float',
    name: 'float_column',
  })
  public floatColumn?: number;

  @column({
    type: 'array',
    name: 'array_column',
  })
  public arrayColumn?: string[];

  @column({
    type: 'string[]',
    name: 'string_array_column',
  })
  public stringArrayColumn?: string[];

  public instanceFunction(): string {
    return `${this.name || ''} bar!`;
  }
}
