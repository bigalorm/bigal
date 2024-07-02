import type { CreateUpdateParams } from '../../src/index.js';

import { Product } from './Product.js';

export class ProductWithCreateUpdateDateTracking extends Product {
  public static override async beforeCreate(values: CreateUpdateParams<ProductWithCreateUpdateDateTracking>): Promise<CreateUpdateParams<ProductWithCreateUpdateDateTracking>> {
    await Promise.resolve();

    return {
      ...values,

      name: `beforeCreate - ${values.name}`,
    };
  }

  public static override beforeUpdate(values: CreateUpdateParams<ProductWithCreateUpdateDateTracking>): CreateUpdateParams<ProductWithCreateUpdateDateTracking> {
    return {
      ...values,

      name: `beforeUpdate - ${values.name}`,
    };
  }
}
