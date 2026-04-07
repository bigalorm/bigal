import { belongsTo, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const ParkingSpace = table('parking_space', {
  ...stringIdBase,
  parkingLot: belongsTo<string>('ParkingLot'),
  name: text().notNull(),
});
