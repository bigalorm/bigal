import { belongsTo, booleanColumn, integer, table } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const ProductCategory = table('product__category', {
  ...modelBase,
  product: belongsTo('Product'),
  category: belongsTo('Category'),
  ordering: integer(),
  isPrimary: booleanColumn(),
});
