import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { getJoinedFilterStoreTable } from './joinedFilterTableNames.js';

@table({ name: getJoinedFilterStoreTable() })
export class JoinedFilterStore extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string' })
  public manager?: string | null;
}
