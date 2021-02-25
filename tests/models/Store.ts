import { column, table } from '../../src/decorators';

import { ModelBase } from './ModelBase';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';

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
