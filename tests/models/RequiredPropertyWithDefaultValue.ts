import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const requiredPropertyWithDefaultValueSchema = {
  ...modelBase,
  foo: text().notNull().default('foobar'),
  bar: text(),
};

export type RequiredPropertyWithDefaultValueSelect = InferSelect<typeof requiredPropertyWithDefaultValueSchema>;
export type RequiredPropertyWithDefaultValueInsert = InferInsert<typeof requiredPropertyWithDefaultValueSchema>;
