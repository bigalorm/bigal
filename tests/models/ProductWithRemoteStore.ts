import { column, table } from '../../src/index.js';

import { Product } from './Product.js';
import { type RemoteStore } from './RemoteStore.js';

@table({ name: 'products_with_remote_store' })
export class ProductWithRemoteStore extends Product {
  @column({ model: 'RemoteStore', name: 'store_id' })
  public override store!: RemoteStore | number;
}
