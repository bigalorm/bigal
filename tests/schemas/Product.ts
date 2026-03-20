import { belongsTo, hasMany, text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables, timestamps } from './index.js';

export const productSchema = {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  sku: text('sku'),
  location: text('location'),
  aliases: textArray('alias_names').default([]),
  store: belongsTo(() => tables.Store!, 'store_id'),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};

export type ProductSelect = InferSelect<typeof productSchema>;
export type ProductInsert = InferInsert<typeof productSchema>;
