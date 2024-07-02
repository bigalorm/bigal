import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';
import { Product } from './Product.js';

@table({
  name: 'stores',
})
export class Store extends ModelBase {
  @column({
    type: 'string',
  })
  public name?: string;

  @column({
    collection: () => Product.name,
    via: 'store',
  })
  public products?: Product[];
}
