import { table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithOptionalEnum = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    status: text<'active' | 'inactive'>(),
  },
  { modelName: 'SimpleWithOptionalEnum' },
);
