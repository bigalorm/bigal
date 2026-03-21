import { belongsTo, hasMany, text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const productSchema = {
  ...modelBase,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
};

export type ProductSelect = InferSelect<typeof productSchema>;
export type ProductInsert = InferInsert<typeof productSchema>;
