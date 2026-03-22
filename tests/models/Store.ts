import { table, hasMany, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const Store = table('stores', {
  ...modelBase,
  name: text(),
  products: hasMany('Product').via('store'),
});
