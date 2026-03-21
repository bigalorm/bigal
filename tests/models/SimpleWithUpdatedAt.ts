import { table, text, updatedAt } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithUpdatedAt = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    updatedAt: updatedAt(),
  },
  { modelName: 'SimpleWithUpdatedAt' },
);
