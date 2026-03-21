import { hasMany, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithCollections = table(
  'simple',
  {
    ...modelBase,
    name: text().notNull(),
    products: hasMany('Product').via('store'),
    categories: hasMany('Category').through('ProductCategory').via('product'),
  },
  { modelName: 'SimpleWithCollections' },
);
