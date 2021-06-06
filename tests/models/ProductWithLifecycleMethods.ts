import type { CreateUpdateParams } from '../../src';
import { table } from '../../src';

import { Product } from './Product';

@table({
  name: 'products',
})
export class ProductWithLifecycleMethods extends Product {
  public static override beforeCreate(values: CreateUpdateParams<ProductWithLifecycleMethods>): CreateUpdateParams<ProductWithLifecycleMethods> {
    return values;
  }

  public static override beforeUpdate(values: CreateUpdateParams<ProductWithLifecycleMethods>): Promise<CreateUpdateParams<ProductWithLifecycleMethods>> {
    return Promise.resolve(values);
  }
}
