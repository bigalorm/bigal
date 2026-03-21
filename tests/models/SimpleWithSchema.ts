import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithSchemaSchema = {
  ...modelBase,
  name: text().notNull(),
};

export type SimpleWithSchemaSelect = InferSelect<typeof simpleWithSchemaSchema>;
export type SimpleWithSchemaInsert = InferInsert<typeof simpleWithSchemaSchema>;
