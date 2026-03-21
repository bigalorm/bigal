import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const parkingSpaceSchema = {
  ...stringIdBase,
  parkingLot: belongsTo<string>('ParkingLot'),
  name: text().notNull(),
};

export type ParkingSpaceSelect = InferSelect<typeof parkingSpaceSchema>;
export type ParkingSpaceInsert = InferInsert<typeof parkingSpaceSchema>;
