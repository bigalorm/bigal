import { column, Entity, primaryColumn, table } from '../../src/index.js';

@table({
  name: 'simple',
})
export class SimpleWithStringId extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    model: () => SimpleWithStringId.name,
  })
  public otherId?: SimpleWithStringId | string;
}
