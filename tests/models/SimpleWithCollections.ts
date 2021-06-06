import { column, table } from '../../src';

import { Category } from './Category';
import { ModelBase } from './ModelBase';
import { Product } from './Product';
import { ProductCategory } from './ProductCategory';

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
