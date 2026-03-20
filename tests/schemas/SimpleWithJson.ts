import { jsonb, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithJsonSchema = {
  ...modelBase,
  name: text('name').notNull(),
  bar: jsonb('bar'),
  keyValue: jsonb<Record<string, number>>('key_value'),
};

export type SimpleWithJsonSelect = InferSelect<typeof simpleWithJsonSchema>;
export type SimpleWithJsonInsert = InferInsert<typeof simpleWithJsonSchema>;
