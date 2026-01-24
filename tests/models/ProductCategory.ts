import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { Category } from './Category.js';
import { Product } from './Product.js';

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

  @column({ type: 'integer', name: 'ordering' })
  public ordering?: number;

  @column({ type: 'boolean', name: 'is_primary' })
  public isPrimary?: boolean;
}
