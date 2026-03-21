import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithUnionSchema = {
  ...modelBase,
  name: text().notNull(),
  status: text().notNull().default('Foo'),
};

export type SimpleWithUnionSelect = InferSelect<typeof simpleWithUnionSchema>;
export type SimpleWithUnionInsert = InferInsert<typeof simpleWithUnionSchema>;
