# Subqueries and Joins in BigAl

This guide covers how to use subqueries and joins for advanced querying in BigAl, including type-safe sorting on joined columns.

## Table of Contents

- [Creating Subqueries](#creating-subqueries)
- [WHERE Clauses with Subqueries](#where-clauses-with-subqueries)
  - [WHERE IN / NOT IN](#where-in--not-in)
  - [WHERE EXISTS / NOT EXISTS](#where-exists--not-exists)
  - [Scalar Subquery Comparisons](#scalar-subquery-comparisons)
- [Joins](#joins)
  - [Model Joins](#model-joins)
  - [Subquery Joins](#subquery-joins)
  - [Sorting on Joined Columns](#sorting-on-joined-columns)
- [Aggregates in Subqueries](#aggregates-in-subqueries)
  - [Aggregate Functions](#aggregate-functions)
  - [GROUP BY](#group-by)
  - [HAVING](#having)
- [Type-Safe Subquery Column Sorting](#type-safe-subquery-column-sorting)
- [DISTINCT ON](#distinct-on)
- [Best Practices](#best-practices)

## Creating Subqueries

Use the `subquery()` function to create a subquery from any repository:

```ts
import { subquery } from 'bigal';

const storeSubquery = subquery(StoreRepository).select(['id']).where({ isActive: true });
```

The `SubqueryBuilder` supports the following methods:

| Method                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `select(columns)`     | Specify columns and/or aggregates to select              |
| `where(query)`        | Filter rows                                              |
| `sort(value)`         | Order results                                            |
| `limit(n)`            | Limit number of rows                                     |
| `groupBy(columns)`    | Group rows for aggregation                               |
| `having(condition)`   | Filter groups based on aggregate values                  |
| `distinctOn(columns)` | PostgreSQL DISTINCT ON (see [DISTINCT ON](#distinct-on)) |

## WHERE Clauses with Subqueries

### WHERE IN / NOT IN

Use subqueries to filter based on a set of values from another table.

**WHERE IN:**

```ts
const activeStores = subquery(StoreRepository).select(['id']).where({ isActive: true });

const products = await ProductRepository.find().where({
  store: { in: activeStores },
});
```

Generated SQL:

```sql
SELECT * FROM "products"
WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "is_active"=$1)
```

**WHERE NOT IN:**

```ts
const inactiveStores = subquery(StoreRepository).select(['id']).where({ isActive: false });

const products = await ProductRepository.find().where({
  store: { '!': { in: inactiveStores } },
});
```

Generated SQL:

```sql
SELECT * FROM "products"
WHERE "store_id" NOT IN (SELECT "id" FROM "stores" WHERE "is_active"=$1)
```

**Note:** If no columns are selected in the subquery, it defaults to `SELECT 1`.

### WHERE EXISTS / NOT EXISTS

Use EXISTS to check for the presence of related records.

**WHERE EXISTS:**

```ts
const hasProducts = subquery(ProductRepository).where({ name: { like: 'Widget%' } });

const stores = await StoreRepository.find().where({
  exists: hasProducts,
});
```

Generated SQL:

```sql
SELECT * FROM "stores"
WHERE EXISTS (SELECT 1 FROM "products" WHERE "name" LIKE $1)
```

**WHERE NOT EXISTS:**

```ts
const stores = await StoreRepository.find().where({
  '!': { exists: hasProducts },
});
```

Generated SQL:

```sql
SELECT * FROM "stores"
WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "name" LIKE $1)
```

### Scalar Subquery Comparisons

Compare column values against scalar subquery results (single values like counts, averages, etc.).

```ts
const avgPrice = subquery(ProductRepository).avg('price');

// Find products priced above average
const expensiveProducts = await ProductRepository.find().where({
  price: { '>': avgPrice },
});
```

Generated SQL:

```sql
SELECT * FROM "products"
WHERE "price">(SELECT AVG("price") FROM "products")
```

**Supported comparison operators:**

| Operator | Description           |
| -------- | --------------------- |
| `>`      | Greater than          |
| `>=`     | Greater than or equal |
| `<`      | Less than             |
| `<=`     | Less than or equal    |
| `'!'`    | Not equal             |
| (direct) | Equal                 |

```ts
// Equal to max price
.where({ price: subquery(ProductRepository).max('price') })

// Not equal to min price
.where({ price: { '!': subquery(ProductRepository).min('price') } })
```

## Joins

BigAl supports two types of joins: model joins (to related entities) and subquery joins.

### Model Joins

Join to related entities defined in your model relationships.

**Inner Join:**

```ts
const products = await ProductRepository.find()
  .join('store')
  .where({ store: { name: 'Acme' } });
```

Generated SQL:

```sql
SELECT "products".* FROM "products"
INNER JOIN "stores" ON "products"."store_id"="stores"."id"
WHERE "stores"."name"=$1
```

**Left Join:**

```ts
const products = await ProductRepository.find()
  .leftJoin('store')
  .where({ store: { name: 'Acme' } });
```

**Custom Alias:**

```ts
const products = await ProductRepository.find()
  .join('store', 'primaryStore')
  .where({ primaryStore: { name: 'Acme' } });
```

**Additional ON Conditions (left join only):**

```ts
const products = await ProductRepository.find().leftJoin('store', 'activeStore', { isActive: true });
```

### Subquery Joins

Join to the results of a subquery. This is useful for aggregating data and joining it back to the main query.

**Basic Subquery Join:**

```ts
const productCounts = subquery(ProductRepository)
  .select(['store', (sb) => sb.count().as('productCount')])
  .groupBy(['store']);

const stores = await StoreRepository.find().join(productCounts, 'stats', { on: { id: 'store' } });
```

Generated SQL:

```sql
SELECT "stores".* FROM "stores"
INNER JOIN (
  SELECT "store_id" AS "store", COUNT(*) AS "productCount"
  FROM "products"
  GROUP BY "store_id"
) AS "stats" ON "stores"."id"="stats"."store"
```

**Left Join to Subquery:**

```ts
const stores = await StoreRepository.find().leftJoin(productCounts, 'stats', { on: { id: 'store' } });
```

**Multiple ON Conditions:**

```ts
const categoryStats = subquery(ProductRepository)
  .select(['store', 'category', (sb) => sb.count().as('count')])
  .groupBy(['store', 'category']);

const stores = await StoreRepository.find().join(categoryStats, 'stats', {
  on: { id: 'store', categoryId: 'category' },
});
```

**Key points:**

- Subquery joins require an alias (second parameter)
- The `on` option maps main table columns to subquery columns
- Use `join()` for INNER JOIN, `leftJoin()` for LEFT JOIN

### Sorting on Joined Columns

Sort by columns from joined tables using dot notation:

```ts
// Sort by model join column
const products = await ProductRepository.find().join('store').sort('store.name asc');

// Sort by subquery join column
const stores = await StoreRepository.find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  .sort('stats.productCount desc');
```

## Aggregates in Subqueries

### Aggregate Functions

Use aggregate functions in subquery selects:

| Function                   | Description            | Example                       |
| -------------------------- | ---------------------- | ----------------------------- |
| `count()`                  | Count all rows         | `sb.count()`                  |
| `count(column)`            | Count non-null values  | `sb.count('name')`            |
| `count(column).distinct()` | Count distinct values  | `sb.count('name').distinct()` |
| `sum(column)`              | Sum numeric values     | `sb.sum('price')`             |
| `avg(column)`              | Average numeric values | `sb.avg('price')`             |
| `max(column)`              | Maximum value          | `sb.max('price')`             |
| `min(column)`              | Minimum value          | `sb.min('createdAt')`         |

**Using aggregates:**

```ts
const stats = subquery(ProductRepository)
  .select(['store', (sb) => sb.count().as('totalProducts'), (sb) => sb.sum('price').as('totalValue'), (sb) => sb.avg('price').as('avgPrice'), (sb) => sb.count('name').distinct().as('uniqueNames')])
  .groupBy(['store']);
```

Generated SQL:

```sql
SELECT "store_id" AS "store",
  COUNT(*) AS "totalProducts",
  SUM("price") AS "totalValue",
  AVG("price") AS "avgPrice",
  COUNT(DISTINCT "name") AS "uniqueNames"
FROM "products"
GROUP BY "store_id"
```

**Default aliases:**

If `.as()` is not called, aggregates use their function name as the alias:

```ts
.select(['store', (sb) => sb.count()])  // alias: 'count'
.select(['store', (sb) => sb.sum('price')])  // alias: 'sum'
```

### GROUP BY

Group rows before applying aggregates:

```ts
const categoryCounts = subquery(ProductRepository)
  .select(['category', (sb) => sb.count().as('productCount')])
  .groupBy(['category']);
```

### HAVING

Filter groups based on aggregate values:

```ts
const popularCategories = subquery(ProductRepository)
  .select(['category', (sb) => sb.count().as('productCount')])
  .groupBy(['category'])
  .having({ productCount: { '>': 10 } });
```

Generated SQL:

```sql
SELECT "category_id" AS "category", COUNT(*) AS "productCount"
FROM "products"
GROUP BY "category_id"
HAVING COUNT(*)>10
```

**HAVING operators:**

| Syntax                   | SQL                |
| ------------------------ | ------------------ |
| `{ alias: 5 }`           | `HAVING AGG(*)=5`  |
| `{ alias: { '>': 5 } }`  | `HAVING AGG(*)>5`  |
| `{ alias: { '>=': 5 } }` | `HAVING AGG(*)>=5` |
| `{ alias: { '<': 5 } }`  | `HAVING AGG(*)<5`  |
| `{ alias: { '<=': 5 } }` | `HAVING AGG(*)<=5` |
| `{ alias: { '!=': 5 } }` | `HAVING AGG(*)<>5` |

**Multiple conditions:**

```ts
.having({
  productCount: { '>=': 5, '<=': 100 }
})
```

Generated SQL: `HAVING COUNT(*)>=5 AND COUNT(*)<=100`

## Type-Safe Subquery Column Sorting

BigAl tracks selected columns through the type system, enabling type-safe sorting on subquery join columns.

**How it works:**

When you use aggregate callbacks with `.as()`, TypeScript tracks the alias:

```ts
import type { TypedAggregateExpression } from 'bigal';

const productCounts = subquery(ProductRepository)
  .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
  .groupBy(['store']);

// TypeScript knows 'stats' has columns: 'store' | 'productCount'
const stores = await StoreRepository.find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  .sort('stats.productCount desc'); // Type-safe!
```

**Invalid columns are caught at compile time:**

```ts
const stores = await StoreRepository.find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  // @ts-expect-error - 'invalidColumn' is not a selected column
  .sort('stats.invalidColumn desc');
```

**Multiple subquery joins:**

```ts
const counts = subquery(ProductRepository)
  .select(['store', (sb): TypedAggregateExpression<'count'> => sb.count().as('count')])
  .groupBy(['store']);

const totals = subquery(ProductRepository)
  .select(['store', (sb): TypedAggregateExpression<'total'> => sb.sum('price').as('total')])
  .groupBy(['store']);

const stores = await StoreRepository.find()
  .join(counts, 'productCounts', { on: { id: 'store' } })
  .join(totals, 'productTotals', { on: { id: 'store' } })
  .sort('productCounts.count desc')
  .sort('productTotals.total asc');
```

## DISTINCT ON

PostgreSQL's `DISTINCT ON` clause lets you get one row per unique combination of specified columns. This is useful for "greatest-per-group" queries like "get the latest order per customer."

### Basic Usage

```ts
// Get one product per store (arbitrary selection)
const products = await ProductRepository.find().distinctOn(['store']).sort('store');
```

Generated SQL:

```sql
SELECT DISTINCT ON ("store_id") * FROM "products" ORDER BY "store_id"
```

### Controlling Which Row is Selected

The ORDER BY clause determines which row is kept for each group. Add secondary sort columns after the DISTINCT ON columns:

```ts
// Get the most recently created product per store
const latestProducts = await ProductRepository.find().distinctOn(['store']).sort('store').sort('createdAt desc');
```

Generated SQL:

```sql
SELECT DISTINCT ON ("store_id") * FROM "products"
ORDER BY "store_id", "created_at" DESC
```

### Multiple DISTINCT ON Columns

```ts
// Get one product per store+category combination
const products = await ProductRepository.find().distinctOn(['store', 'category']).sort('store').sort('category').sort('createdAt desc');
```

### Combined with Other Query Methods

`distinctOn()` works with `where()`, `select()`, `limit()`, and `toJSON()`:

```ts
const latestActiveProducts = await ProductRepository.find()
  .select(['name', 'store', 'createdAt'])
  .where({ isActive: true })
  .distinctOn(['store'])
  .sort('store')
  .sort('createdAt desc')
  .limit(10)
  .toJSON();
```

### Important Constraints

1. **ORDER BY is required**: PostgreSQL requires an ORDER BY clause when using DISTINCT ON.

2. **ORDER BY must start with DISTINCT ON columns**: The first columns in ORDER BY must match the DISTINCT ON columns in the same order.

```ts
// Correct
.distinctOn(['store', 'category'])
.sort('store')
.sort('category')
.sort('createdAt desc')

// Error: ORDER BY must start with 'store', not 'createdAt'
.distinctOn(['store'])
.sort('createdAt desc')
```

1. **Cannot be combined with `withCount()`**: Due to PostgreSQL limitations, `distinctOn()` throws an error if combined with `withCount()`.

### Using DISTINCT ON in Subqueries

`distinctOn()` is also available on `SubqueryBuilder`, enabling "greatest-per-group" patterns in subquery joins and WHERE IN clauses:

```ts
// Get the latest product per store via subquery join
const latestProducts = subquery(ProductRepository).select(['store', 'name', 'createdAt']).distinctOn(['store']).sort('store').sort('createdAt desc');

const stores = await StoreRepository.find().join(latestProducts, 'latestProduct', { on: { id: 'store' } });
```

Generated SQL:

```sql
SELECT "stores".* FROM "stores"
INNER JOIN (
  SELECT DISTINCT ON ("store_id") "store_id" AS "store", "name", "created_at" AS "createdAt"
  FROM "products"
  ORDER BY "store_id", "created_at" DESC
) AS "latestProduct" ON "stores"."id"="latestProduct"."store"
```

You can also use it in WHERE IN subqueries:

```ts
// Find stores that have at least one product
const distinctStores = subquery(ProductRepository).select(['store']).distinctOn(['store']).sort('store');

const stores = await StoreRepository.find().where({
  id: { in: distinctStores },
});
```

## Best Practices

### 1. Always specify an alias for subquery joins

```ts
// Correct
.join(subquery, 'stats', { on: { id: 'store' } })

// Error: alias is required
.join(subquery, { on: { id: 'store' } })
```

### 2. Use explicit return types for type-safe sorting

```ts
import type { TypedAggregateExpression } from 'bigal';

// Enables type-safe sorting
.select([
  'store',
  (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')
])
```

### 3. Use `.as()` for meaningful column names

```ts
// Clear column names
.select([
  'store',
  (sb) => sb.count().as('productCount'),
  (sb) => sb.avg('price').as('averagePrice')
])

// Less clear with default names
.select([
  'store',
  (sb) => sb.count(),  // alias: 'count'
  (sb) => sb.avg('price')  // alias: 'avg'
])
```

### 4. Combine WHERE and HAVING appropriately

- Use `where()` to filter rows **before** grouping
- Use `having()` to filter groups **after** aggregation

```ts
const activeProductCounts = subquery(ProductRepository)
  .select(['store', (sb) => sb.count().as('activeCount')])
  .where({ isActive: true }) // Filter before grouping
  .groupBy(['store'])
  .having({ activeCount: { '>=': 5 } }); // Filter after grouping
```

### 5. Use scalar subqueries for single-value comparisons

```ts
// Good: scalar subquery for single value
const maxPrice = subquery(ProductRepository).max('price');
await ProductRepository.find().where({ price: maxPrice });

// Unnecessary: IN with single-value subquery
const maxPriceSubquery = subquery(ProductRepository).select(['price']).sort({ price: 'desc' }).limit(1);
await ProductRepository.find().where({ price: { in: maxPriceSubquery } });
```

### 6. Filter subqueries to improve performance

```ts
// More efficient: filter in subquery
const recentStats = subquery(OrderRepository)
  .select(['store', (sb) => sb.sum('total').as('recentTotal')])
  .where({ createdAt: { '>=': lastMonth } })
  .groupBy(['store']);

// Less efficient: filter after joining
const allStats = subquery(OrderRepository)
  .select(['store', (sb) => sb.sum('total').as('total')])
  .groupBy(['store']);
```
