import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithUnion = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    status: text<'Bar' | 'Foo' | 'Foobar'>().notNull().default('Foo'),
  },
  { modelName: 'SimpleWithUnion' },
);
