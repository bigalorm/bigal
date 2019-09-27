import { Product } from './Product';
import { createDateColumn } from '../../src/decorators';

export class ProductWithCreatedAt extends Product {
  @createDateColumn()
  public createdAt!: Date;
}
