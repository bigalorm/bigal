import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const parkingSpaceSchema = {
  ...stringIdBase,
  parkingLot: belongsTo<string>(() => tables.ParkingLot!, 'parking_lot_id'),
  name: text('name').notNull(),
};

export type ParkingSpaceSelect = InferSelect<typeof parkingSpaceSchema>;
export type ParkingSpaceInsert = InferInsert<typeof parkingSpaceSchema>;
