import { column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';
import { Product } from './Product.js';
import { ProductCategory } from './ProductCategory.js';

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
