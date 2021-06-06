import { createDateColumn } from '../../src';

import { Product } from './Product';

export class ProductWithCreatedAt extends Product {
  @createDateColumn()
  public createdAt!: Date;
}
