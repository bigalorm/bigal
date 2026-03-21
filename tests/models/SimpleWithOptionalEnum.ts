import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithOptionalEnumSchema = {
  ...modelBase,
  name: text().notNull(),
  status: text(),
};

export type SimpleWithOptionalEnumSelect = InferSelect<typeof simpleWithOptionalEnumSchema>;
export type SimpleWithOptionalEnumInsert = InferInsert<typeof simpleWithOptionalEnumSchema>;
