import { Entity } from '../../src';
import {
  column,
  table,
} from '../../src/decorators';
import { ModelBase } from './ModelBase';
import { Product } from './Product';

@table({
  name: 'stores',
})
export class Store extends ModelBase implements Entity {
  @column({
    type: 'string',
  })
  public name?: string;

  @column({
    collection: Product,
    via: 'store',
  })
  public products?: Product[];
}
