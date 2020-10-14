import { table } from '../../src/decorators';

import { Product } from './Product';

@table({
  name: 'readonly_products',
  readonly: true,
})
export class ReadonlyProduct extends Product {}
