import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const requiredPropertyWithDefaultValueFunctionSchema = {
  ...modelBase,
  foo: text('foo').notNull().default('foobar'),
  bar: text('bar'),
};

export type RequiredPropertyWithDefaultValueFunctionSelect = InferSelect<typeof requiredPropertyWithDefaultValueFunctionSchema>;
export type RequiredPropertyWithDefaultValueFunctionInsert = InferInsert<typeof requiredPropertyWithDefaultValueFunctionSchema>;
