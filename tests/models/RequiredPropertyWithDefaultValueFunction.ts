import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const RequiredPropertyWithDefaultValueFunction = table('some_other_table', {
  ...modelBase,
  foo: text().notNull().default('foobar'),
  bar: text(),
}, { modelName: 'RequiredPropertyWithDefaultValueFunction' });
