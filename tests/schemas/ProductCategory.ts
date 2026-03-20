import { belongsTo, booleanColumn, integer } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables } from './index.js';

export const productCategorySchema = {
  ...modelBase,
  product: belongsTo(() => tables.Product!, 'product_id'),
  category: belongsTo(() => tables.Category!, 'category_id'),
  ordering: integer('ordering'),
  isPrimary: booleanColumn('is_primary'),
};

export type ProductCategorySelect = InferSelect<typeof productCategorySchema>;
export type ProductCategoryInsert = InferInsert<typeof productCategorySchema>;
