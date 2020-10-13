import { Entity } from '../../src';
import { ModelBase } from './ModelBase';
import { column, table } from '../../src/decorators';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';
// eslint-disable-next-line import/no-cycle
import { ProductCategory } from './ProductCategory';

@table({
  name: 'categories',
})
export class Category extends ModelBase implements Entity {
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
  public products!: Product[];
}
