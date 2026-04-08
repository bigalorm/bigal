---
description: Many-to-one, one-to-many, and many-to-many relationships with belongsTo and hasMany builders, QueryResult type narrowing, and populate options.
---

# Relationships

BigAl supports three relationship patterns: many-to-one, one-to-many, and many-to-many. Relationships
use string model name references by default. Model names are auto-derived from table names (e.g.,
`products` becomes `Product`).

## Many-to-one (belongsTo)

Use `belongsTo` when this table holds the foreign key:

```ts
import { belongsTo, table, serial, text, createdAt, updatedAt } from 'bigal';

export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  store: belongsTo('Store'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

- The inferred select type for `store` is `number` (the FK value)
- After `.populate('store')`, the type changes to the full Store entity
- The FK column name is auto-derived as `snakeCase(propertyKey) + '_id'` (e.g., `store_id`)
- Override the FK column name: `belongsTo('Store', { name: 'shop_id' })`

## One-to-many (hasMany)

Use `hasMany` on the inverse side:

```ts
import { table, hasMany, serial, text, createdAt, updatedAt } from 'bigal';

export const Store = table('stores', {
  id: serial().primaryKey(),
  name: text(),
  products: hasMany('Product').via('store'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

- `.via('store')` references the property name on the related table (not the database column)
- `hasMany` columns appear in `InferSelect` as optional `Record<string, unknown>[]` to support
  populate. `QueryResult` strips them from results, so they only appear after `.populate()`

## Many-to-many (through)

Use `.through()` for relationships via a junction table:

```ts
// Product.ts
export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  categories: hasMany('Category').through('ProductCategory').via('product'),
});
```

```ts
// Category.ts
export const Category = table('categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  products: hasMany('Product').through('ProductCategory').via('category'),
});
```

```ts
// ProductCategory.ts (junction table)
export const ProductCategory = table('product__category', {
  id: serial().primaryKey(),
  product: belongsTo('Product'),
  category: belongsTo('Category'),
  ordering: integer(),
  isPrimary: boolean(),
});
```

- `.through()` specifies the junction table model name
- `.via()` references the property on the junction table that points back to this table
- The junction table must have `belongsTo` relationships to both sides

## Self-referencing relationships

Models can reference themselves for hierarchical data. Use the model name string (auto-derived
from the table name, or set via `modelName` option):

```ts
export const Category = table('categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  parent: belongsTo('Category'),
  children: hasMany('Category').via('parent'),
});
```

String references are resolved at `initialize()` time, so there is no circular import issue.

## QueryResult type narrowing

When you query entities, BigAl returns `QueryResult<T>` which narrows relationship fields
automatically:

```ts
const product = await Product.findOne().where({ id: 1 });

// product.store is `number`, not a union type
console.log(product.store); // number (the foreign key ID)
```

The narrowing rules:

| InferSelect type                                   | QueryResult type     |
| -------------------------------------------------- | -------------------- |
| `number` (belongsTo FK)                            | `number`             |
| `Record<string, unknown>[] \| undefined` (hasMany) | Stripped from result |

### Using QueryResult in type definitions

`QueryResult` accepts a `TableDefinition` directly - no need to manually call `InferSelect`:

```ts
import type { QueryResult } from 'bigal';

// store is `number`, categories (hasMany) is stripped
type ProductRow = QueryResult<typeof Product>;

// Pick specific fields
type ProductSummary = Pick<QueryResult<typeof Product>, 'id' | 'name' | 'store'>;
```

## Typed populate

When using object-style `initialize({ models: { Product, Store } })`, populate results are fully
typed. The full models map is threaded through repositories, so `.populate('store')` resolves to the
related entity type rather than `Record<string, unknown>`.

```ts
const product = await Product.findOne().where({ id: 1 }).populate('store');

// product.store is typed as the full Store entity, not unknown
```

Array-style `initialize({ models: [...] })` still works but does not provide typed populate results.

## Populate with junction table filtering

For many-to-many relationships, you can filter and sort by columns on the junction table:

```ts
const compilation = await compilationRepository
  .findOne()
  .where({ id: compilationId })
  .populate('tracks', {
    select: ['name', 'duration'],
    where: { isPublished: true },
    through: {
      where: { revisionDeleted: null },
      sort: 'ordering asc',
    },
  });
```

- `through.where` filters junction table records
- `through.sort` orders populated items by junction table columns
- When `through.sort` is specified, it takes precedence over the target entity sort

## Best practices

1. **Use `QueryResult<typeof Model>` for return types** - strips hasMany, narrows FK types
2. **Use string references for model relationships** - avoids circular import issues
3. **Use object-style `initialize()`** - enables typed populate results
4. **All relationships are validated at startup** - `initialize()` throws if a referenced model is missing from the `models` object/array
