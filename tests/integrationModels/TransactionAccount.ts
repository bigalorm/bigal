import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { TransactionItem } from './TransactionItem.js';
import { getAccountTable } from './transactionTableNames.js';

@table({ name: getAccountTable() })
export class TransactionAccount extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'integer', required: true })
  public capacity!: number;

  @column({ collection: () => TransactionItem.name, via: 'account' })
  public items?: TransactionItem[];
}
