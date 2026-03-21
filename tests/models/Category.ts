import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';
import { tables } from './index.js';

export const categorySchema = {
  ...modelBase,
  name: text().notNull(),
  products: hasMany(() => tables.Product!)
    .through(() => tables.ProductCategory!)
    .via('category'),
};

export type CategorySelect = InferSelect<typeof categorySchema>;
export type CategoryInsert = InferInsert<typeof categorySchema>;
