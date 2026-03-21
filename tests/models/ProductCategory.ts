import { belongsTo, booleanColumn, integer } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';
import { tables } from './index.js';

export const productCategorySchema = {
  ...modelBase,
  product: belongsTo(() => tables.Product!),
  category: belongsTo(() => tables.Category!),
  ordering: integer(),
  isPrimary: booleanColumn(),
};

export type ProductCategorySelect = InferSelect<typeof productCategorySchema>;
export type ProductCategoryInsert = InferInsert<typeof productCategorySchema>;
