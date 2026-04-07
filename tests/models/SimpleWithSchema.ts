import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithSchema = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
  },
  { modelName: 'SimpleWithSchema', schema: 'foo' },
);
