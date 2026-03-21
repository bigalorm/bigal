import { createdAt, table, text, updatedAt } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithCreatedAtAndUpdatedAt = table('simple', {
  ...modelBase,
  name: text().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, { modelName: 'SimpleWithCreatedAtAndUpdatedAt' });
