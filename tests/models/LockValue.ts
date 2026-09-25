import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';

@table({ name: 'lock_values' })
export class LockValue extends ModelBase {
  @column({ type: 'json' })
  public lock!: { mode: string };

  @column({ type: 'string' })
  public select?: string;
}
