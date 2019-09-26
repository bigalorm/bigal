import { Entity } from '../../src';
import {
  column,
  primaryColumn,
  table,
} from '../../src/decorators';
import { ModelBase } from './ModelBase';
import { Product } from './Product';

@table({
  name: 'stores',
})
export class Store extends ModelBase implements Entity {
  @primaryColumn({
    type: 'integer',
  })
  public id!: number;

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
