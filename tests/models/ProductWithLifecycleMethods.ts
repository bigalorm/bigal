import { table } from '../../src/schema/index.js';

import { productColumns } from './Product.js';

export const ProductWithLifecycleMethods = table('products', productColumns, {
  modelName: 'ProductWithLifecycleMethods',
  hooks: {
    beforeCreate(values) {
      return values;
    },
  },
});
