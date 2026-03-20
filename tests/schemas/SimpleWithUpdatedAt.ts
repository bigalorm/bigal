import { text, updatedAt } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithUpdatedAtSchema = {
  ...modelBase,
  name: text('name').notNull(),
  updatedAt: updatedAt(),
};

export type SimpleWithUpdatedAtSelect = InferSelect<typeof simpleWithUpdatedAtSchema>;
export type SimpleWithUpdatedAtInsert = InferInsert<typeof simpleWithUpdatedAtSchema>;
