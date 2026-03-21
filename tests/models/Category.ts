import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const categorySchema = {
  ...modelBase,
  name: text().notNull(),
  products: hasMany('Product').through('ProductCategory').via('category'),
};

export type CategorySelect = InferSelect<typeof categorySchema>;
export type CategoryInsert = InferInsert<typeof categorySchema>;
