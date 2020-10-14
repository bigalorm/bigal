import type { Entity } from '../../src';
import { column, primaryColumn, table } from '../../src/decorators';

// eslint-disable-next-line import/no-cycle
import { Category } from './Category';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';

@table({
  name: 'product__category',
})
export class ProductCategory implements Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    model: () => Product.name,
    name: 'product_id',
  })
  public product!: number | Product;

  @column({
    model: () => Category.name,
    name: 'category_id',
  })
  public category!: number | Category;
}
