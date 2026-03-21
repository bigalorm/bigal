import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const RequiredPropertyWithDefaultValue = table('some_table', {
  ...modelBase,
  foo: text().notNull().default('foobar'),
  bar: text(),
}, { modelName: 'RequiredPropertyWithDefaultValue' });
