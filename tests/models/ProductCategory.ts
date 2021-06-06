import { Entity, column, primaryColumn, table } from '../../src';

// eslint-disable-next-line import/no-cycle
import { Category } from './Category';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';

@table({
  name: 'product__category',
})
export class ProductCategory extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    model: () => Product.name,
    name: 'product_id',
  })
  public product!: Product | number;

  @column({
    model: () => Category.name,
    name: 'category_id',
  })
  public category!: Category | number;
}
