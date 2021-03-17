import type { CreateOrUpdateParams } from '../../src';
import { table } from '../../src';

import { Product } from './Product';

@table({
  name: 'products',
})
export class ProductWithLifecycleMethods extends Product {
  public static beforeCreate(values: CreateOrUpdateParams<ProductWithLifecycleMethods>): CreateOrUpdateParams<ProductWithLifecycleMethods> {
    return values;
  }
}
