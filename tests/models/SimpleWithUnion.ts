import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithUnion = table('simple', {
  ...modelBase,
  name: text().notNull(),
  status: text().notNull().default('Foo'),
}, { modelName: 'SimpleWithUnion' });
