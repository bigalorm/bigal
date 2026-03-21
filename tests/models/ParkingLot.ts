import { table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const ParkingLot = table('parking_lot', {
  ...stringIdBase,
  name: text().notNull(),
});
