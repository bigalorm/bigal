import { updateDateColumn } from '../../src';

import { SimpleWithCreatedAt } from './SimpleWithCreatedAt';

export class SimpleWithCreatedAtAndUpdatedAt extends SimpleWithCreatedAt {
  @updateDateColumn()
  public updatedAt!: Date;
}
