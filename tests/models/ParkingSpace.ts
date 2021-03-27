import { column, primaryColumn, table, Entity } from '../../src';

@table({
  name: 'parking_space',
})
export class ParkingSpace extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;
}
