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
import { belongsTo, defineTable as table, serial, text, createdAt, updatedAt } from 'bigal';

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
import { defineTable as table, hasMany, serial, text, createdAt, updatedAt } from 'bigal';

export const Store = table('stores', {
  id: serial().primaryKey(),
  name: text(),
  products: hasMany('Product').via('store'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

- `.via('store')` references the property name on the related table (not the database column)
- `hasMany` columns are excluded from the select and insert types -- they only exist after
  `.populate()`

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

Tables can reference themselves for hierarchical data. Use arrow functions when the table references
itself:

```ts
const tables: Record<string, TableDefinition<any, any>> = {};

export const Category = table('categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  parent: belongsTo(() => tables.Category!),
  children: hasMany(() => tables.Category!).via('parent'),
});
tables.Category = Category;
```

Use a registry object with arrow functions to handle the circular reference.

## Arrow functions vs string references

Both approaches work for `belongsTo` and `hasMany`:

```ts
// String references (preferred) -- no imports needed
store: belongsTo('Store'),
products: hasMany('Product').via('store'),
categories: hasMany('Category').through('ProductCategory').via('product'),

// Arrow functions -- useful for self-references or explicit table definition refs
store: belongsTo(() => Store),
products: hasMany(() => Product).via('store'),
```

String references use the model name, which is auto-derived from the table name. Arrow functions
defer evaluation, which can help with circular imports.

## QueryResult type narrowing

When you query entities, BigAl returns `QueryResult<T>` which narrows relationship fields
automatically:

```ts
const product = await productRepository.findOne().where({ id: 1 });

// product.store is `number`, not a union type
console.log(product.store); // number (the foreign key ID)
```

The narrowing rules:

| Select type (InferSelect) | QueryResult type     |
| ------------------------- | -------------------- |
| `number` (belongsTo FK)   | `number`             |
| (hasMany collection)      | Excluded from result |

### Using QueryResult in type definitions

Use `Pick<QueryResult<T>, ...>` instead of `Pick<T, ...>` for derived types:

```ts
import type { QueryResult, InferSelect } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;

// store is `number`
type ProductSummary = Pick<QueryResult<ProductRow>, 'id' | 'name' | 'store'>;
```

## QueryResultPopulated

For type safety with populated relations:

```ts
import type { QueryResultPopulated, InferSelect } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;

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
2. **Use string references for model relationships** -- avoids circular import issues
3. **All relationships are validated at startup** -- `initialize()` throws if a referenced model is
   missing from the `models` object/array
