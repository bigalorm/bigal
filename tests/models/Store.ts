import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';
import { tables } from './index.js';

export const storeSchema = {
  ...modelBase,
  name: text(),
  products: hasMany(() => tables.Product!).via('store'),
};

export type StoreSelect = InferSelect<typeof storeSchema>;
export type StoreInsert = InferInsert<typeof storeSchema>;
