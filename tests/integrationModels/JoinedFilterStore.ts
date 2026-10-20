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

  @column({ type: 'datetime', name: 'opened_at', required: true })
  public openedAt!: Date;

  @column({ type: 'string', required: true })
  public code!: string;

  @column({ type: 'string', required: true })
  public tier!: 'bronze' | 'gold' | 'silver';
}
