import { NotEntity, column, table } from '../../src/index.js';

import { ModelBase } from './ModelBase.js';
import { Store } from './Store.js';

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
