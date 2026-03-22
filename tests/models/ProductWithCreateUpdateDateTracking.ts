import { table } from '../../src/schema/index.js';

import { productColumns } from './Product.js';

export const ProductWithCreateUpdateDateTracking = table('products', productColumns, {
  modelName: 'ProductWithCreateUpdateDateTracking',
  hooks: {
    async beforeCreate(values) {
      await Promise.resolve();
      return {
        ...values,
        name: `beforeCreate - ${values.name}`,
      };
    },
    beforeUpdate(values) {
      return {
        ...values,
        name: `beforeUpdate - ${values.name}`,
      };
    },
  },
});
