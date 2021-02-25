import { Entity } from '../../src';
import { column, primaryColumn, table } from '../../src/decorators';

@table({
  name: 'non_standard_primary_id',
})
export class NonStandardPrimaryId extends Entity {
  @primaryColumn({
    type: 'string',
    name: 'unique_id',
  })
  public uniqueId!: string;

  @column({
    type: 'string',
  })
  public foo?: string;
}
