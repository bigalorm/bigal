import { column, table } from '../../src';

import { ModelBase } from './ModelBase';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';
// eslint-disable-next-line import/no-cycle
import { ProductCategory } from './ProductCategory';

@table({
  name: 'categories',
})
export class Category extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    collection: () => Product.name,
    through: () => ProductCategory.name,
    via: 'category',
  })
  public products?: Product[];
}
