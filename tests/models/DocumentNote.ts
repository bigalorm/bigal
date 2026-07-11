import { column, table } from '../../src/index.js';

import type { Document } from './Document.js';
import { ModelBase } from './ModelBase.js';

@table({
  name: 'document_notes',
})
export class DocumentNote extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public body!: string;

  @column({
    model: 'document',
    name: 'document_id',
  })
  public document!: Document | number;
}
