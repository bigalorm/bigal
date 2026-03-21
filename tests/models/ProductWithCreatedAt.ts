import { createdAt } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { productSchema } from './Product.js';

export const productWithCreatedAtSchema = {
  ...productSchema,
  createdAt: createdAt(),
};

export type ProductWithCreatedAtSelect = InferSelect<typeof productWithCreatedAtSchema>;
export type ProductWithCreatedAtInsert = InferInsert<typeof productWithCreatedAtSchema>;
