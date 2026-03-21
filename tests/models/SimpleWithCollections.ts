import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithCollectionsSchema = {
  ...modelBase,
  name: text().notNull(),
  products: hasMany('Product').via('store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
};

export type SimpleWithCollectionsSelect = InferSelect<typeof simpleWithCollectionsSchema>;
export type SimpleWithCollectionsInsert = InferInsert<typeof simpleWithCollectionsSchema>;
