import { NotEntity, column, table } from '../../src';

import { ModelBase } from './ModelBase';
import { Store } from './Store';

export interface IJsonLikeEntity {
  id: string;
  message: string;
}

@table({
  name: 'simple',
})
export class SimpleWithRelationAndJson extends ModelBase {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    model: () => Store.name,
    name: 'store_id',
  })
  public store!: Store | number;

  @column({
    type: 'json',
  })
  public message?: NotEntity<IJsonLikeEntity>;
}
