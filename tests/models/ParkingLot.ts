import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const parkingLotSchema = {
  ...stringIdBase,
  name: text().notNull(),
};

export type ParkingLotSelect = InferSelect<typeof parkingLotSchema>;
export type ParkingLotInsert = InferInsert<typeof parkingLotSchema>;
