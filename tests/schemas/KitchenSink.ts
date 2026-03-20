import { integer, real, text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const kitchenSinkSchema = {
  ...modelBase,
  name: text('name').notNull(),
  intColumn: integer('int_column'),
  floatColumn: real('float_column'),
  arrayColumn: textArray('array_column'),
  stringArrayColumn: textArray('string_array_column'),
};

export type KitchenSinkSelect = InferSelect<typeof kitchenSinkSchema>;
export type KitchenSinkInsert = InferInsert<typeof kitchenSinkSchema>;
