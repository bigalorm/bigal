import { belongsTo, hasMany, text, textArray, view } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const ReadonlyProduct = view('readonly_products', {
  ...modelBase,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
});
