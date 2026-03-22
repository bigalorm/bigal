import { createdAt, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithCreatedAt = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    createdAt: createdAt(),
  },
  { modelName: 'SimpleWithCreatedAt' },
);
