import { integer, real, table, text, textArray } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const KitchenSink = table('kitchen_sink', {
  ...modelBase,
  name: text().notNull(),
  intColumn: integer(),
  floatColumn: real(),
  arrayColumn: textArray(),
  stringArrayColumn: textArray(),
});
