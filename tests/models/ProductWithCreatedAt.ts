import { createDateColumn } from '../../src/decorators';

import { Product } from './Product';

export class ProductWithCreatedAt extends Product {
  @createDateColumn()
  public createdAt!: Date;
}
