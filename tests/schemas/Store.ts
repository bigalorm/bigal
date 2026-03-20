import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables, timestamps } from './index.js';

export const storeSchema = {
  ...modelBase,
  ...timestamps,
  name: text('name'),
  products: hasMany(() => tables.Product!).via('store'),
};

export type StoreSelect = InferSelect<typeof storeSchema>;
export type StoreInsert = InferInsert<typeof storeSchema>;
