import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({
  name: 'documents',
})
export class Document extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public title!: string;

  @column({
    type: 'vector',
    dimensions: 3,
  })
  public embedding?: number[];
}
