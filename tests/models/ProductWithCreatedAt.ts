import { createdAt, table } from '../../src/schema/index.js';

import { productColumns } from './Product.js';

export const ProductWithCreatedAt = table(
  'products',
  {
    ...productColumns,
    createdAt: createdAt(),
  },
  { modelName: 'ProductWithCreatedAt' },
);
