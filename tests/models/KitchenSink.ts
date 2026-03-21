import { integer, real, text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const kitchenSinkSchema = {
  ...modelBase,
  name: text().notNull(),
  intColumn: integer(),
  floatColumn: real(),
  arrayColumn: textArray(),
  stringArrayColumn: textArray(),
};

export type KitchenSinkSelect = InferSelect<typeof kitchenSinkSchema>;
export type KitchenSinkInsert = InferInsert<typeof kitchenSinkSchema>;
