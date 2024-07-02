import { createDateColumn } from '../../src/index.js';

import { Product } from './Product.js';

export class ProductWithCreatedAt extends Product {
  @createDateColumn()
  public createdAt!: Date;
}
