import { Product } from './Product';

export class ProductWithCreateUpdateDateTracking extends Product {
  public static async beforeCreate(values: Partial<ProductWithCreateUpdateDateTracking>): Promise<Partial<ProductWithCreateUpdateDateTracking>> {
    await Promise.resolve();

    return {
      ...values,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      name: `beforeCreate - ${values.name}`,
    };
  }

  public static beforeUpdate(values: Partial<ProductWithCreateUpdateDateTracking>): Partial<ProductWithCreateUpdateDateTracking> {
    return {
      ...values,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      name: `beforeUpdate - ${values.name}`,
    };
  }
}
