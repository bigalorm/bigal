---
description: Map PostgreSQL views to readonly models with ReadonlyRepository. Supports inheritance, schema options, and all query features.
---

# Views and Readonly Repositories

BigAl does not distinguish between tables and views. Both use the `@table()` decorator. Setting `readonly: true` causes
`initialize()` to return a `ReadonlyRepository` — which omits `create`, `update`, and `destroy` methods,
catching accidental writes at compile time.

BigAl does not create or manage views. Create them in PostgreSQL via your migration tool.

## Defining a view model

### Standalone model

```ts
import { column, primaryColumn, table, Entity } from 'bigal';

@table({
  name: 'product_summaries',
  readonly: true,
})
export class ProductSummary extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string', required: true, name: 'store_name' })
  public storeName!: string;

  @column({ type: 'integer', required: true, name: 'category_count' })
  public categoryCount!: number;
}
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

### Inheriting from an existing model

If the view has the same columns as an existing table, extend the model to reuse column definitions:

```ts
import { table } from 'bigal';
import { Product } from './Product';

@table({
  name: 'readonly_products',
  readonly: true,
})
export class ReadonlyProduct extends Product {}
```

### Schema option

For views in a non-default schema:

```ts
@table({
  schema: 'reporting',
  name: 'product_summaries',
  readonly: true,
})
export class ProductSummary extends Entity {
  // ...
}
```

## Initializing the repository

Include the view model in `initialize()`. BigAl creates a `ReadonlyRepository` automatically:

```ts
import { initialize, ReadonlyRepository } from 'bigal';
import { Product, Store, ProductSummary } from './models';

const repos = initialize({
  models: [Product, Store, ProductSummary],
  pool,
  readonlyPool,
});

const productSummaryRepository = repos.ProductSummary as ReadonlyRepository<ProductSummary>;
```

## Querying

Readonly repositories support the same query methods as regular repositories:

```ts
const summaries = await productSummaryRepository
  .find()
  .where({ storeName: { contains: 'Acme' } })
  .sort('categoryCount desc')
  .limit(10);

const summary = await productSummaryRepository.findOne().where({ id: 42 });

const count = await productSummaryRepository.count().where({ categoryCount: { '>': 5 } });
```

All query features work: `where` operators, `sort`, `skip`, `limit`, `paginate`, `populate`, `join`, `withCount`, and `distinctOn`.

## Available methods

| Method      | Repository | ReadonlyRepository |
| ----------- | ---------- | ------------------ |
| `findOne()` | Yes        | Yes                |
| `find()`    | Yes        | Yes                |
| `count()`   | Yes        | Yes                |
| `create()`  | Yes        | No                 |
| `update()`  | Yes        | No                 |
| `destroy()` | Yes        | No                 |
