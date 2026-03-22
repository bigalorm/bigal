import { table, belongsTo, hasMany, text, textArray } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const productColumns = {
  ...modelBase,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
};

export const Product = table('products', productColumns);
