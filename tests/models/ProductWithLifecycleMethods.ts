import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { productSchema } from './Product.js';

export const productWithLifecycleMethodsSchema = {
  ...productSchema,
};

export type ProductWithLifecycleMethodsSelect = InferSelect<typeof productWithLifecycleMethodsSchema>;
export type ProductWithLifecycleMethodsInsert = InferInsert<typeof productWithLifecycleMethodsSchema>;
