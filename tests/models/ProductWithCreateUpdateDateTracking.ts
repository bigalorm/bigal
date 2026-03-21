import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { productSchema } from './Product.js';

export const productWithCreateUpdateDateTrackingSchema = {
  ...productSchema,
};

export type ProductWithCreateUpdateDateTrackingSelect = InferSelect<typeof productWithCreateUpdateDateTrackingSchema>;
export type ProductWithCreateUpdateDateTrackingInsert = InferInsert<typeof productWithCreateUpdateDateTrackingSchema>;
