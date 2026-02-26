import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { type LevelTwo } from './LevelTwo.js';

@table({
  name: 'level_one',
})
export class LevelOne extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public one!: string;

  @column({
    type: 'string',
  })
  public foo?: string;

  @column({
    required: true,
    model: 'LevelTwo',
    name: 'level_two_id',
  })
  public levelTwo!: LevelTwo | string;
}
