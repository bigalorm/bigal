import { view } from '../../src/schema/index.js';

import { productColumns } from './Product.js';

export const ReadonlyProduct = view('readonly_products', productColumns);
