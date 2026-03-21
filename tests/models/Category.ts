import { hasMany, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const Category = table('categories', {
  ...modelBase,
  name: text().notNull(),
  products: hasMany('Product').through('ProductCategory').via('category'),
});
