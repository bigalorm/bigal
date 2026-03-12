---
description: Type-safe subqueries for WHERE IN, EXISTS, and scalar comparisons. Model joins, subquery joins, aggregates, GROUP BY, and HAVING.
---

# Subqueries and Joins

BigAl supports subqueries for WHERE clauses, scalar comparisons, and joins. All subqueries are type-safe and composable.

## Creating subqueries

Use the `subquery()` function:

```ts
import { subquery } from 'bigal';

const activeStores = subquery(storeRepository).select(['id']).where({ isActive: true });
```

`SubqueryBuilder` methods:

| Method                | Description                         |
| --------------------- | ----------------------------------- |
| `select(columns)`     | Columns and/or aggregates to select |
| `where(query)`        | Filter rows                         |
| `sort(value)`         | Order results                       |
| `limit(n)`            | Limit rows                          |
| `groupBy(columns)`    | Group for aggregation               |
| `having(condition)`   | Filter groups by aggregate values   |
| `distinctOn(columns)` | PostgreSQL DISTINCT ON              |

## WHERE IN / NOT IN

```ts
const activeStores = subquery(storeRepository).select(['id']).where({ isActive: true });

// WHERE IN
const products = await productRepository.find().where({
  store: { in: activeStores },
});
// SQL: WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "is_active"=$1)

// WHERE NOT IN
const products = await productRepository.find().where({
  store: { '!': { in: activeStores } },
});
```

## WHERE EXISTS / NOT EXISTS

```ts
const hasProducts = subquery(productRepository).where({ name: { like: 'Widget%' } });

// EXISTS
const stores = await storeRepository.find().where({
  exists: hasProducts,
});

// NOT EXISTS
const stores = await storeRepository.find().where({
  '!': { exists: hasProducts },
});
```

If no columns are selected in the subquery, it defaults to `SELECT 1`.

## Scalar subquery comparisons

Compare column values against single-value subquery results:

```ts
const avgPrice = subquery(productRepository).avg('price');

const expensiveProducts = await productRepository.find().where({
  price: { '>': avgPrice },
});
// SQL: WHERE "price">(SELECT AVG("price") FROM "products")
```

Supported operators: `>`, `>=`, `<`, `<=`, `'!'` (not equal), or direct equality.

```ts
// Equal to max price
.where({ price: subquery(productRepository).max('price') })

// Not equal to min price
.where({ price: { '!': subquery(productRepository).min('price') } })
```

## Model joins

Join to related entities defined in your model:

```ts
// Inner join
const products = await productRepository
  .find()
  .join('store')
  .where({ store: { name: 'Acme' } });
// SQL: SELECT "products".* FROM "products"
//   INNER JOIN "stores" ON "products"."store_id"="stores"."id"
//   WHERE "stores"."name"=$1

// Left join
const products = await productRepository
  .find()
  .leftJoin('store')
  .where({ store: { name: 'Acme' } });

// Custom alias
const products = await productRepository
  .find()
  .join('store', 'primaryStore')
  .where({ primaryStore: { name: 'Acme' } });

// Additional ON conditions (left join only)
const products = await productRepository.find().leftJoin('store', 'activeStore', { isActive: true });
```

## Subquery joins

Join to subquery results:

```ts
const productCounts = subquery(productRepository)
  .select(['store', (sb) => sb.count().as('productCount')])
  .groupBy(['store']);

// Inner join
const stores = await storeRepository.find().join(productCounts, 'stats', { on: { id: 'store' } });
// SQL: SELECT "stores".* FROM "stores"
//   INNER JOIN (
//     SELECT "store_id" AS "store", COUNT(*) AS "productCount"
//     FROM "products" GROUP BY "store_id"
//   ) AS "stats" ON "stores"."id"="stats"."store"

// Left join
const stores = await storeRepository.find().leftJoin(productCounts, 'stats', { on: { id: 'store' } });
```

Multiple ON conditions:

```ts
const categoryStats = subquery(productRepository)
  .select(['store', 'category', (sb) => sb.count().as('count')])
  .groupBy(['store', 'category']);

const stores = await storeRepository.find().join(categoryStats, 'stats', { on: { id: 'store', categoryId: 'category' } });
```

## Sorting on joined columns

Use dot notation to sort by joined table columns:

```ts
// Model join
const products = await productRepository.find().join('store').sort('store.name asc');

// Subquery join
const stores = await storeRepository
  .find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  .sort('stats.productCount desc');
```

## Aggregate functions

Available in subquery selects:

| Function                   | Description            |
| -------------------------- | ---------------------- |
| `count()`                  | Count all rows         |
| `count(column)`            | Count non-null values  |
| `count(column).distinct()` | Count distinct values  |
| `sum(column)`              | Sum numeric values     |
| `avg(column)`              | Average numeric values |
| `max(column)`              | Maximum value          |
| `min(column)`              | Minimum value          |

```ts
const stats = subquery(productRepository)
  .select(['store', (sb) => sb.count().as('totalProducts'), (sb) => sb.sum('price').as('totalValue'), (sb) => sb.avg('price').as('avgPrice'), (sb) => sb.count('name').distinct().as('uniqueNames')])
  .groupBy(['store']);
```

If `.as()` is not called, aggregates use their function name as the alias (e.g. `count`, `sum`).

## GROUP BY and HAVING

```ts
const popularCategories = subquery(productRepository)
  .select(['category', (sb) => sb.count().as('productCount')])
  .groupBy(['category'])
  .having({ productCount: { '>': 10 } });
// SQL: ... GROUP BY "category_id" HAVING COUNT(*)>10
```

HAVING operators:

| Syntax                   | SQL                |
| ------------------------ | ------------------ |
| `{ alias: 5 }`           | `HAVING AGG(*)=5`  |
| `{ alias: { '>': 5 } }`  | `HAVING AGG(*)>5`  |
| `{ alias: { '>=': 5 } }` | `HAVING AGG(*)>=5` |
| `{ alias: { '<': 5 } }`  | `HAVING AGG(*)<5`  |
| `{ alias: { '<=': 5 } }` | `HAVING AGG(*)<=5` |
| `{ alias: { '!=': 5 } }` | `HAVING AGG(*)<>5` |

Multiple conditions:

```ts
.having({ productCount: { '>=': 5, '<=': 100 } })
// SQL: HAVING COUNT(*)>=5 AND COUNT(*)<=100
```

## Type-safe subquery sorting

Annotate aggregate callbacks with `TypedAggregateExpression` for compile-time column validation:

```ts
import type { TypedAggregateExpression } from 'bigal';

const productCounts = subquery(productRepository)
  .select([
    'store',
    (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount'),
  ])
  .groupBy(['store']);

const stores = await storeRepository.find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  .sort('stats.productCount desc'); // Type-safe!

// @ts-expect-error - 'invalidColumn' is not a selected column
.sort('stats.invalidColumn desc');
```

## DISTINCT ON in subqueries

Use `distinctOn()` for "greatest-per-group" patterns:

```ts
const latestProducts = subquery(productRepository).select(['store', 'name', 'createdAt']).distinctOn(['store']).sort('store').sort('createdAt desc');

const stores = await storeRepository.find().join(latestProducts, 'latestProduct', { on: { id: 'store' } });
```

See [Querying > DISTINCT ON](/guide/querying#distinct-on) for constraints and usage with top-level queries.
