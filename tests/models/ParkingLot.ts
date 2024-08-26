import { column, Entity, primaryColumn, table } from '../../src/index.js';

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
