import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithOptionalEnumSchema = {
  ...modelBase,
  name: text('name').notNull(),
  status: text('status'),
};

export type SimpleWithOptionalEnumSelect = InferSelect<typeof simpleWithOptionalEnumSchema>;
export type SimpleWithOptionalEnumInsert = InferInsert<typeof simpleWithOptionalEnumSchema>;
