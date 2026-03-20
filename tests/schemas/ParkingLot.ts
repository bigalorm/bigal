import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './index.js';

export const parkingLotSchema = {
  ...stringIdBase,
  name: text('name').notNull(),
};

export type ParkingLotSelect = InferSelect<typeof parkingLotSchema>;
export type ParkingLotInsert = InferInsert<typeof parkingLotSchema>;
