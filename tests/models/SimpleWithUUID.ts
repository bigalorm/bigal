import { column, Entity, primaryColumn, table } from '../../src/index.js';

@table({
  name: 'simple_with_uuid',
})
export class SimpleWithUUID extends Entity {
  @primaryColumn({
    type: 'uuid',
  })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;
}
