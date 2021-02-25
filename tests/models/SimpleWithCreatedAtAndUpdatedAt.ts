import { updateDateColumn } from '../../src/decorators';

import { SimpleWithCreatedAt } from './SimpleWithCreatedAt';

export class SimpleWithCreatedAtAndUpdatedAt extends SimpleWithCreatedAt {
  @updateDateColumn()
  public updatedAt!: Date;
}
