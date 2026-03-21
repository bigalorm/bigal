import type { InferSelect } from '../../src/schema/index.js';

import { productSchema } from './Product.js';

export const readonlyProductSchema = {
  ...productSchema,
};

export type ReadonlyProductSelect = InferSelect<typeof readonlyProductSchema>;
