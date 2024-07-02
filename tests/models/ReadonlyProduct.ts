import { table } from '../../src/index.js';

import { Product } from './Product.js';

@table({
  name: 'readonly_products',
  readonly: true,
})
export class ReadonlyProduct extends Product {}
