import { column, Entity, primaryColumn, table } from '../../src/index.js';

import type { LevelThree } from './LevelThree.js';

@table({
  name: 'level_two',
})
export class LevelTwo extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public two!: string;

  @column({
    type: 'string',
  })
  public foo?: string;

  @column({
    required: true,
    model: 'LevelThree',
    name: 'level_three_id',
  })
  public levelThree!: LevelThree | string;
}
