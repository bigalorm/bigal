import { table, text, textArray } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithStringCollection = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    otherIds: textArray().default([]),
  },
  { modelName: 'SimpleWithStringCollection' },
);
