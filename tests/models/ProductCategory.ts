import { Entity } from '../../src';
import {
  column,
  primaryColumn,
  table,
} from '../../src/decorators';
import { Category } from './Category';
import { Product } from './Product';

@table({
  name: 'product__category',
})
export class ProductCategory implements Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    model: Product,
    name: 'product_id',
  })
  public product!: number | Product;

  @column({
    model: Category,
    name: 'category_id',
  })
  public category!: number | Category;
}
