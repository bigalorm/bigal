---
description: Many-to-one, one-to-many, and many-to-many relationships with belongsTo and hasMany builders, QueryResult type narrowing, and populate options.
---

# Relationships

BigAl supports three relationship patterns: many-to-one, one-to-many, and many-to-many.

## Many-to-one (belongsTo)

Use `belongsTo` when this table holds the foreign key:

```ts
import { belongsTo, defineTable as table, serial, text, createdAt, updatedAt } from 'bigal';
import { Store } from './Store';

export const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  store: belongsTo(() => Store, 'store_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

- The `$inferSelect` type for `store` is `number` (the FK value)
- After `.populate('store')`, the type changes to the full Store entity
- The arrow function `() => Store` defers evaluation, allowing circular references between tables
- The second argument (`'store_id'`) is the database column name for the foreign key

## One-to-many (hasMany)

Use `hasMany` on the inverse side:

```ts
import { defineTable as table, hasMany, serial, text, createdAt, updatedAt } from 'bigal';
import { Product } from './Product';

export const Store = table('stores', {
  id: serial('id').primaryKey(),
  name: text('name'),
  products: hasMany(() => Product).via('store'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

- `.via('store')` references the property name on the related table (not the database column)
- `hasMany` columns are excluded from `$inferSelect` and `$inferInsert` -- they only exist after
  `.populate()`

## Many-to-many (through)

Use `.through()` for relationships via a junction table:

```ts
// Product.ts
export const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  categories: hasMany(() => Category)
    .through(() => ProductCategory)
    .via('product'),
});
```

```ts
// Category.ts
export const Category = table('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  products: hasMany(() => Product)
    .through(() => ProductCategory)
    .via('category'),
});
```

```ts
// ProductCategory.ts (junction table)
export const ProductCategory = table('product__category', {
  id: serial('id').primaryKey(),
  product: belongsTo(() => Product, 'product_id'),
  category: belongsTo(() => Category, 'category_id'),
  ordering: integer('ordering'),
  isPrimary: boolean('is_primary'),
});
```

- `.through()` specifies the junction table definition
- `.via()` references the property on the junction table that points back to this table
- The junction table must have `belongsTo` relationships to both sides

## Self-referencing relationships

Tables can reference themselves for hierarchical data:

```ts
const tables: Record<string, TableDefinition<any, any>> = {};

export const Category = table('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parent: belongsTo(() => tables.Category!, 'parent_id'),
  children: hasMany(() => tables.Category!).via('parent'),
});
tables.Category = Category;
```

Use a registry object with arrow functions to handle the circular reference.

## QueryResult type narrowing

When you query entities, BigAl returns `QueryResult<T>` which narrows relationship fields
automatically:

```ts
const product = await productRepository.findOne().where({ id: 1 });

// product.store is `number`, not a union type
console.log(product.store); // number (the foreign key ID)
```

The narrowing rules:

| Select type (`$inferSelect`) | QueryResult type     |
| ---------------------------- | -------------------- |
| `number` (belongsTo FK)      | `number`             |
| (hasMany collection)         | Excluded from result |

### Using QueryResult in type definitions

Use `Pick<QueryResult<T>, ...>` instead of `Pick<T, ...>` for derived types:

```ts
import type { QueryResult } from 'bigal';

type ProductRow = typeof Product.$inferSelect;

// store is `number`
type ProductSummary = Pick<QueryResult<ProductRow>, 'id' | 'name' | 'store'>;
```

## QueryResultPopulated

For type safety with populated relations:

```ts
import type { QueryResultPopulated } from 'bigal';

type ProductRow = typeof Product.$inferSelect;

// store is QueryResult<StoreRow>
type ProductWithStore = QueryResultPopulated<ProductRow, 'store'>;
```

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

1. **Use `QueryResult<T>` for return types** -- avoids union type ambiguity
2. **Use arrow functions for model references** -- enables circular references and lazy evaluation
3. **All relationships are validated at startup** -- `createBigAl()` throws if a referenced table is
   missing from the `models` array
