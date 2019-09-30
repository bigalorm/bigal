import { Product } from './Product';
import { table } from '../../src/decorators';

@table({
  name: 'readonly_products',
  readonly: true,
})
export class ReadonlyProduct extends Product {
}