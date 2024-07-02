import { column, primaryColumn, table, Entity } from '../../src/index.js';

@table({
  name: 'level_three',
})
export class LevelThree extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
  })
  public foo?: string;

  @column({
    type: 'string',
    required: true,
  })
  public three!: string;
}
