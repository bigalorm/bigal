import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithUnionSchema = {
  ...modelBase,
  name: text('name').notNull(),
  status: text('status').notNull().default('Foo'),
};

export type SimpleWithUnionSelect = InferSelect<typeof simpleWithUnionSchema>;
export type SimpleWithUnionInsert = InferInsert<typeof simpleWithUnionSchema>;
