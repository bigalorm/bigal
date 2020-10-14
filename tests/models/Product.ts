import type { Entity } from '../../src';
import { column, table } from '../../src/decorators';

// eslint-disable-next-line import/no-cycle
// eslint-disable-next-line import/no-cycle
import { Category } from './Category';
import { ModelBase } from './ModelBase';
// eslint-disable-next-line import/no-cycle
import { ProductCategory } from './ProductCategory';
import type { Store } from './Store';

@table({
  name: 'products',
})
export class Product extends ModelBase implements Entity {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    type: 'string',
  })
  public sku?: string;

  @column({
    type: 'string[]',
    defaultsTo: [],
    name: 'alias_names',
  })
  public aliases?: string[];

  @column({
    model: 'store', // NOTE: Lower case to test that case doesn't matter
    name: 'store_id',
  })
  public store!: number | Store;

  @column({
    collection: () => Category.name,
    through: () => ProductCategory.name,
    via: 'product',
  })
  public categories!: Category[];
}
