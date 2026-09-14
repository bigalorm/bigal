import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { type TransactionAccount } from './TransactionAccount.js';
import { getItemTable } from './transactionTableNames.js';

@table({ name: getItemTable() })
export class TransactionItem extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ model: 'TransactionAccount', name: 'account_id', required: true })
  public account!: TransactionAccount | number;
}
