# Views and Readonly Repositories

This guide covers how to use BigAl with PostgreSQL views by creating readonly repositories.
Readonly repositories expose only read operations (`findOne`, `find`, `count`),
making them a natural fit for database views.

## Table of Contents

- [Overview](#overview)
- [Defining a Model for a View](#defining-a-model-for-a-view)
  - [Standalone Model](#standalone-model)
  - [Inheriting from an Existing Model](#inheriting-from-an-existing-model)
  - [Using a Schema](#using-a-schema)
- [Initializing the Repository](#initializing-the-repository)
- [Querying](#querying)
- [Available Methods](#available-methods)

## Overview

BigAl does not distinguish between tables and views at the ORM level. Both use the `@table()` decorator.
Setting `readonly: true` in the decorator options causes `initialize()` to return a `ReadonlyRepository`
instead of a `Repository`. The `ReadonlyRepository` type does not include `create`, `update`, or `destroy` methods,
so TypeScript will catch accidental write attempts at compile time.

BigAl does not create or manage database schemas, so you are responsible for creating the view in PostgreSQL (e.g. via a migration tool).

## Defining a Model for a View

### Standalone Model

Define a model class that maps to the view's columns, and set `readonly: true` in the `@table()` decorator:

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

This maps to a view created in PostgreSQL:

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

### Inheriting from an Existing Model

If your view has the same columns as an existing table (or a subset), you can extend the existing model to reuse its column definitions:

```ts
import { table } from 'bigal';
import { Product } from './Product';

@table({
  name: 'readonly_products',
  readonly: true,
})
export class ReadonlyProduct extends Product {}
```

This avoids duplicating `@column()` definitions. The `ReadonlyProduct` model inherits all column metadata from `Product` but maps to the `readonly_products` view and produces a `ReadonlyRepository`.

### Using a Schema

If the view lives in a non-default schema, specify it with the `schema` option:

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

## Initializing the Repository

Include the model in the `initialize()` call. BigAl automatically creates a `ReadonlyRepository` for models marked with `readonly: true`.

```ts
import { initialize, ReadonlyRepository } from 'bigal';
import { Product, Store, ProductSummary } from './models';

const repositoriesByName = initialize({
  models: [Product, Store, ProductSummary],
  pool,
  readonlyPool,
});

const productSummaryRepository = repositoriesByName.ProductSummary as ReadonlyRepository<ProductSummary>;
```

## Querying

Readonly repositories support the same query methods and chaining as regular repositories:

```ts
// Find multiple records with filtering, sorting, and pagination
const summaries = await productSummaryRepository
  .find()
  .where({
    storeName: { contains: 'Acme' },
  })
  .sort('categoryCount desc')
  .limit(10);

// Find a single record
const summary = await productSummaryRepository.findOne().where({ id: 42 });

// Count matching records
const count = await productSummaryRepository.count().where({
  categoryCount: { '>': 5 },
});
```

All query features documented in the [README](../README.md) work with readonly repositories, including `where` operators, `sort`, `skip`, `limit`, `paginate`, `populate`, `join`, `withCount`, and `distinctOn`.

## Available Methods

| Method      | `Repository` | `ReadonlyRepository` |
| ----------- | ------------ | -------------------- |
| `findOne()` | Yes          | Yes                  |
| `find()`    | Yes          | Yes                  |
| `count()`   | Yes          | Yes                  |
| `create()`  | Yes          | No                   |
| `update()`  | Yes          | No                   |
| `destroy()` | Yes          | No                   |
