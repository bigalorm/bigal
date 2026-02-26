import { type CreateUpdateParams } from '../../src/index.js';
import { table } from '../../src/index.js';

import { Product } from './Product.js';

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
