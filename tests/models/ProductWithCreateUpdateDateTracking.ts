import type { CreateUpdateParams } from '../../src';

import { Product } from './Product';

export class ProductWithCreateUpdateDateTracking extends Product {
  public static override async beforeCreate(values: CreateUpdateParams<ProductWithCreateUpdateDateTracking>): Promise<CreateUpdateParams<ProductWithCreateUpdateDateTracking>> {
    await Promise.resolve();

    return {
      ...values,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      name: `beforeCreate - ${values.name}`,
    };
  }

  public static override beforeUpdate(values: CreateUpdateParams<ProductWithCreateUpdateDateTracking>): CreateUpdateParams<ProductWithCreateUpdateDateTracking> {
    return {
      ...values,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      name: `beforeUpdate - ${values.name}`,
    };
  }
}
