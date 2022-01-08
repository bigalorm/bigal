import { column, primaryColumn, table, Entity } from '../../src';

@table({
  name: 'parking_lot',
})
export class ParkingLot extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;
}
