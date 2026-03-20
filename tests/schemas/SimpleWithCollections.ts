import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables } from './index.js';

export const simpleWithCollectionsSchema = {
  ...modelBase,
  name: text('name').notNull(),
  products: hasMany(() => tables.Product!).via('store'),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};

export type SimpleWithCollectionsSelect = InferSelect<typeof simpleWithCollectionsSchema>;
export type SimpleWithCollectionsInsert = InferInsert<typeof simpleWithCollectionsSchema>;
