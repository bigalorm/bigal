import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { type JoinedFilterStore } from './JoinedFilterStore.js';
import { getJoinedFilterProductTable } from './joinedFilterTableNames.js';

export interface JoinedFilterProductDetails {
  store?: string;
  and?: { status: string };
}

@table({ name: getJoinedFilterProductTable() })
export class JoinedFilterProduct extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string', required: true })
  public kind!: string;

  @column({ model: 'JoinedFilterStore', name: 'store_id', required: true })
  public store!: JoinedFilterStore | number;

  @column({ type: 'json' })
  public details?: JoinedFilterProductDetails | null;
}
