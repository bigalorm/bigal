import { column, table } from '../../src/index.js';

import { Category } from './Category.js';
import { ModelBase } from './ModelBase.js';
import { Product } from './Product.js';
import { ProductCategory } from './ProductCategory.js';

@table({
  name: 'simple',
})
export class SimpleWithCollections extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    collection: () => Product.name,
    via: 'store',
  })
  public products?: Product[];

  @column({
    collection: () => Category.name,
    through: () => ProductCategory.name,
    via: 'product',
  })
  public categories!: Category[];
}
