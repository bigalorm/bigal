import { column, primaryColumn, table, Entity } from '../../src/index.js';

import { ParkingLot } from './ParkingLot.js';

@table({
  name: 'parking_space',
})
export class ParkingSpace extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    model: () => ParkingLot.name,
    name: 'parking_lot_id',
    required: true,
  })
  public parkingLot!: ParkingLot | string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  public getLotAndName(): string {
    return `${typeof this.parkingLot === 'string' ? this.parkingLot : this.parkingLot.id} - ${this.name}`;
  }
}
