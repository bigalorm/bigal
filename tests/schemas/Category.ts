import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables, timestamps } from './index.js';

export const categorySchema = {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  products: hasMany(() => tables.Product!)
    .through(() => tables.ProductCategory!)
    .via('category'),
};

export type CategorySelect = InferSelect<typeof categorySchema>;
export type CategoryInsert = InferInsert<typeof categorySchema>;
