import {Product} from "./Product";

export class ProductWithCreateUpdateDateTracking extends Product {
  public static async beforeCreate(values: Partial<ProductWithCreateUpdateDateTracking>) {
    await Promise.resolve();

    return {
      ...values,
      name: `beforeUpdate - ${values.name}`,
    };
  }
  public static beforeUpdate(values: Partial<ProductWithCreateUpdateDateTracking>) {
    return {
      ...values,
      name: `beforeUpdate - ${values.name}`,
    };
  }
}
