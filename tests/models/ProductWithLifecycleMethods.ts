import { belongsTo, hasMany, table, text, textArray } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const ProductWithLifecycleMethods = table(
  'products',
  {
    ...modelBase,
    name: text().notNull(),
    sku: text(),
    location: text(),
    aliases: textArray({ name: 'alias_names' }).default([]),
    store: belongsTo('Store'),
    categories: hasMany('Category').through('ProductCategory').via('product'),
  },
  {
    modelName: 'ProductWithLifecycleMethods',
    hooks: {
      beforeCreate(values) {
        return values;
      },
    },
  },
);
