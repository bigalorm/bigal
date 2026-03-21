import { belongsTo, createdAt, hasMany, table, text, textArray } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const ProductWithCreatedAt = table('products', {
  ...modelBase,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
  createdAt: createdAt(),
}, { modelName: 'ProductWithCreatedAt' });
