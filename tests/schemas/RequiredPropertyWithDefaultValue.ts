import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const requiredPropertyWithDefaultValueSchema = {
  ...modelBase,
  foo: text('foo').notNull().default('foobar'),
  bar: text('bar'),
};

export type RequiredPropertyWithDefaultValueSelect = InferSelect<typeof requiredPropertyWithDefaultValueSchema>;
export type RequiredPropertyWithDefaultValueInsert = InferInsert<typeof requiredPropertyWithDefaultValueSchema>;
