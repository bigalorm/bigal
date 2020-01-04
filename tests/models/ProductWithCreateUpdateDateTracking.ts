import { Product } from './Product';

export class ProductWithCreateUpdateDateTracking extends Product {
  public static async beforeCreate(values: Partial<ProductWithCreateUpdateDateTracking>): Promise<Partial<ProductWithCreateUpdateDateTracking>> {
    await Promise.resolve();

    return {
      ...values,
      name: `beforeCreate - ${values.name}`,
    };
  }

  public static beforeUpdate(values: Partial<ProductWithCreateUpdateDateTracking>): Partial<ProductWithCreateUpdateDateTracking> {
    return {
      ...values,
      name: `beforeUpdate - ${values.name}`,
    };
  }
}
