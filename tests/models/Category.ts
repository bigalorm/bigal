import { Entity } from '../../src';
import { ModelBase } from './ModelBase';
import {
  column,
  table,
} from '../../src/decorators';
// eslint-disable-next-line import/no-cycle
import { Product } from './Product';

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
    collection: 'Product',
    through: 'ProductCategory',
    via: 'category',
  })
  public products!: Product[];
}
