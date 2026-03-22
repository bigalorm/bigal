---
description: Define readonly models backed by PostgreSQL views with view() and ReadonlyRepository. Supports schema options and all query features.
---

# Views and Readonly Repositories

BigAl provides a `view()` function for defining models backed by PostgreSQL views. The `view()`
function is equivalent to `table()` with `readonly: true` - it produces a `ReadonlyRepository`
that omits `create`, `update`, and `destroy` methods, catching accidental writes at compile time.

BigAl does not create or manage views. Create them in PostgreSQL via your migration tool.

## Defining a view model

### Using view()

```ts
import { view, serial, text, integer } from 'bigal';

export const ProductSummary = view('product_summaries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  storeName: text().notNull(),
  categoryCount: integer().notNull(),
});
```

Corresponding view in PostgreSQL:

```sql
CREATE VIEW product_summaries AS
SELECT
  p.id,
  p.name,
  s.name AS store_name,
  COUNT(pc.category_id) AS category_count
FROM products p
JOIN stores s ON s.id = p.store_id
LEFT JOIN product_categories pc ON pc.product_id = p.id
GROUP BY p.id, p.name, s.name;
```

### Using table() with readonly option

Alternatively, use `table()` with `readonly: true`:

```ts
import { defineTable as table, serial, text, integer } from 'bigal';

export const ProductSummary = table(
  'product_summaries',
  {
    id: serial().primaryKey(),
    name: text().notNull(),
    storeName: text().notNull(),
    categoryCount: integer().notNull(),
  },
  { readonly: true },
);
```

### Sharing columns with a table

If a view returns the same columns as a table (e.g., a filtered subset),
share the column definitions:

```ts
import { table, view, serial, text, integer, boolean } from 'bigal';

const productColumns = {
  id: serial().primaryKey(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  isActive: boolean().notNull(),
};

export const Product = table('products', {
  ...productColumns,
  store: belongsTo('Store'),
});

// View returns the same columns, just filtered to active products
export const ActiveProduct = view('active_products', productColumns);
```

### Schema option

For views in a non-default schema:

```ts
export const ReportSummary = view(
  'product_summaries',
  {
    id: serial().primaryKey(),
    storeName: text().notNull(),
    totalRevenue: integer().notNull(),
  },
  { schema: 'reporting' },
);
```

## Initializing the repository

Include the model in `initialize()`. BigAl creates a `ReadonlyRepository` automatically for models
defined with `view()` or `table()` with `readonly: true`:

```ts
import { initialize } from 'bigal';
import type { ReadonlyRepository } from 'bigal';
import { Product, Store, ProductSummary } from './models';

const { Product, ProductSummary } = initialize({
  models: { Product, Store, ProductSummary },
  pool,
  readonlyPool,
});

// ProductSummary only has find(), findOne(), and count()
```

For repository type annotations, use `ReadonlyRepository<typeof Model>`:

```ts
function getSummaries(repo: ReadonlyRepository<typeof ProductSummary>) {
  return repo.find().where({ categoryCount: { '>': 5 } });
}
```

## Querying

Readonly repositories support the same query methods as regular repositories:

```ts
const summaries = await ProductSummary.find()
  .where({ storeName: { contains: 'Acme' } })
  .sort('categoryCount desc')
  .limit(10);

const summary = await ProductSummary.findOne().where({ id: 42 });

const count = await ProductSummary.count().where({ categoryCount: { '>': 5 } });
```

All query features work: `where` operators, `sort`, `skip`, `limit`, `paginate`, `populate`, `join`,
`withCount`, and `distinctOn`.

## Available methods

| Method      | Repository | ReadonlyRepository |
| ----------- | ---------- | ------------------ |
| `findOne()` | Yes        | Yes                |
| `find()`    | Yes        | Yes                |
| `count()`   | Yes        | Yes                |
| `create()`  | Yes        | No                 |
| `update()`  | Yes        | No                 |
| `destroy()` | Yes        | No                 |
