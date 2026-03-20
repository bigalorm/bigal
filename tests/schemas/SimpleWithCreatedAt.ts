import { createdAt, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithCreatedAtSchema = {
  ...modelBase,
  name: text('name').notNull(),
  createdAt: createdAt(),
};

export type SimpleWithCreatedAtSelect = InferSelect<typeof simpleWithCreatedAtSchema>;
export type SimpleWithCreatedAtInsert = InferInsert<typeof simpleWithCreatedAtSchema>;
