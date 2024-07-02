import { updateDateColumn } from '../../src/index.js';

import { SimpleWithCreatedAt } from './SimpleWithCreatedAt.js';

export class SimpleWithCreatedAtAndUpdatedAt extends SimpleWithCreatedAt {
  @updateDateColumn()
  public updatedAt!: Date;
}
