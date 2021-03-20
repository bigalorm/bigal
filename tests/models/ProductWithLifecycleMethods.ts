import type { CreateUpdateParams } from '../../src';
import { table } from '../../src';

import { Product } from './Product';

@table({
  name: 'products',
})
export class ProductWithLifecycleMethods extends Product {
  public static beforeCreate(values: CreateUpdateParams<ProductWithLifecycleMethods>): CreateUpdateParams<ProductWithLifecycleMethods> {
    return values;
  }

  public static beforeUpdate(values: CreateUpdateParams<ProductWithLifecycleMethods>): Promise<CreateUpdateParams<ProductWithLifecycleMethods>> {
    return Promise.resolve(values);
  }
}
