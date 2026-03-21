import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const requiredPropertyWithDefaultValueFunctionSchema = {
  ...modelBase,
  foo: text().notNull().default('foobar'),
  bar: text(),
};

export type RequiredPropertyWithDefaultValueFunctionSelect = InferSelect<typeof requiredPropertyWithDefaultValueFunctionSchema>;
export type RequiredPropertyWithDefaultValueFunctionInsert = InferInsert<typeof requiredPropertyWithDefaultValueFunctionSchema>;
