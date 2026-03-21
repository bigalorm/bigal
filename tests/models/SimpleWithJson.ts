import { jsonb, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithJsonSchema = {
  ...modelBase,
  name: text().notNull(),
  bar: jsonb(),
  keyValue: jsonb<Record<string, number>>(),
};

export type SimpleWithJsonSelect = InferSelect<typeof simpleWithJsonSchema>;
export type SimpleWithJsonInsert = InferInsert<typeof simpleWithJsonSchema>;
