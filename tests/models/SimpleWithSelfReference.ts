import { column, primaryColumn, table, Entity } from '../../src/index.js';

@table({
  name: 'simple',
})
export class SimpleWithSelfReference extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    model: () => SimpleWithSelfReference.name,
    name: 'source_id',
  })
  public source?: SimpleWithSelfReference | string;

  @column({
    collection: () => SimpleWithSelfReference.name,
    via: 'source',
  })
  public translations?: SimpleWithSelfReference[];
}
