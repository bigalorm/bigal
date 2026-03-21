import { jsonb, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithJson = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    bar: jsonb(),
    keyValue: jsonb<Record<string, number>>(),
  },
  { modelName: 'SimpleWithJson' },
);
