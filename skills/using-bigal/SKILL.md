---
name: using-bigal
description: >-
  Type-safe PostgreSQL ORM guidance for BigAl. Use when importing BigAl,
  defining Entity models with decorators, writing WhereQuery filters,
  using Repository patterns, or deciding between BigAl and raw SQL.
  Covers model definition, fluent query building, joins, subqueries,
  pagination, JSONB querying, and common gotchas.
---

# Using BigAl

BigAl is a PostgreSQL-optimized, type-safe TypeScript ORM. It uses decorator-based models, a fluent builder pattern for queries, and the Repository pattern for CRUD operations.

## Quick Start

```ts
import { column, primaryColumn, table, Entity, initialize, Repository } from 'bigal';
import { Pool } from 'postgres-pool';

@table({ name: 'products' })
class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;
}

const pool = new Pool('postgres://localhost/mydb');
const repos = initialize({ models: [Product], pool });
const Product = repos.Product as Repository<Product>;

const products = await Product
  .find()
  .where({ priceCents: { '>=': 1000 } })
  .sort('name asc')
  .limit(10);
```

## When to Use BigAl vs Raw SQL

**Use BigAl for:**

- Standard CRUD operations
- Simple to moderately complex WHERE clauses
- Joins on defined relationships
- Pagination, sorting, and counting
- Subqueries with aggregates
- DISTINCT ON queries
- Upserts with ON CONFLICT

**Drop to raw SQL for:**

- CTEs (WITH clauses)
- Window functions beyond DISTINCT ON
- Complex recursive queries
- Bulk operations with custom locking (SELECT FOR UPDATE)
- Database-specific features BigAl does not wrap

BigAl wraps your existing connection pool — `postgres-pool`, `pg`, or `@neondatabase/serverless`.
The pool is always accessible for raw queries, so you can eject to SQL at any point:

```ts
const { rows } = await pool.query('SELECT * FROM products WHERE tsv @@ plainto_tsquery($1)', ['search term']);
```

Use BigAl for the 90% of queries that fit its fluent API, and raw SQL for the rest.

## SQL-to-BigAl Translation Table

### Basic queries

| SQL                                                   | BigAl                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `SELECT * FROM products WHERE id = 1`                 | `Product.findOne().where({ id: 1 })`                     |
| `SELECT name FROM products WHERE id = 1`              | `Product.findOne({ select: ['name'] }).where({ id: 1 })` |
| `SELECT * FROM products WHERE name ILIKE '%widget%'`  | `Product.find().where({ name: { contains: 'widget' } })` |
| `SELECT * FROM products WHERE price >= 100`           | `Product.find().where({ price: { '>=': 100 } })`         |
| `SELECT * FROM products WHERE status IN ('a','b')`    | `Product.find().where({ status: ['a', 'b'] })`           |
| `SELECT * FROM products WHERE status <> 'x'`          | `Product.find().where({ status: { '!': 'x' } })`         |
| `SELECT * FROM products WHERE deleted_at IS NOT NULL` | `Product.find().where({ deletedAt: { '!': null } })`     |
| `SELECT * FROM products ORDER BY name LIMIT 10`       | `Product.find().where({}).sort('name asc').limit(10)`    |
| `SELECT COUNT(*) FROM products WHERE active = true`   | `Product.count().where({ active: true })`                |

### CRUD

| SQL                                                         | BigAl                                          |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `INSERT INTO products (name) VALUES ('Widget') RETURNING *` | `Product.create({ name: 'Widget' })`       |
| `UPDATE products SET name = 'X' WHERE id = 1 RETURNING *`   | `Product.update({ id: 1 }, { name: 'X' })` |
| `DELETE FROM products WHERE id = 1 RETURNING *`             | `Product.destroy({ id: 1 })`               |

### Subqueries, joins, and advanced

| SQL                                                                             | BigAl                                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `WHERE store_id IN (SELECT id FROM stores WHERE active)`                        | `.where({ store: { in: subquery(Store).select(['id']).where({ active: true }) } })` |
| `INNER JOIN stores ON products.store_id = stores.id WHERE stores.name = 'Acme'` | `.join('store').where({ store: { name: 'Acme' } })`                                     |
| `SELECT DISTINCT ON (store_id) * ... ORDER BY store_id, created_at DESC`        | `.distinctOn(['store']).sort('store').sort('createdAt desc')`                           |
| `ON CONFLICT (sku) DO NOTHING`                                                  | `{ onConflict: { action: 'ignore', targets: ['sku'] } }`                                |
| `ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name`                          | `{ onConflict: { action: 'merge', targets: ['sku'], merge: ['name'] } }`                |

## Model Definition

### Decorators

Every model extends `Entity` and uses decorators:

```ts
import { column, primaryColumn, createDateColumn, updateDateColumn, versionColumn, table, Entity } from 'bigal';

@table({ name: 'products', schema: 'public' })
class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string' })
  public sku?: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;

  @column({ type: 'json' })
  public metadata?: Record<string, unknown>;

  @createDateColumn()
  public createdAt!: Date;

  @updateDateColumn()
  public updatedAt!: Date;

  @versionColumn()
  public version!: number;
}
```

### Column types

`'string'`, `'integer'`, `'float'`, `'boolean'`, `'date'`, `'datetime'`, `'json'`, `'string[]'`, `'integer[]'`, `'float[]'`, `'boolean[]'`

### Relationships

**Many-to-one** — current entity holds the foreign key:

```ts
@column({ model: () => 'Store', name: 'store_id' })
public store!: number | Store;
```

**One-to-many** — inverse side (must be optional):

```ts
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];
```

**Many-to-many** — requires a join table Entity:

```ts
@column({
  collection: () => 'Category',
  through: () => 'ProductCategory',
  via: 'product',
})
public categories?: Category[];
```

Reference model names by string (`'Store'`, not `Store`) to avoid circular imports. Model names are case-insensitive.

### Readonly models (views)

```ts
@table({ name: 'product_summaries', readonly: true })
class ProductSummary extends Entity {
  /* ... */
}
```

`initialize()` returns a `ReadonlyRepository` which omits `create`, `update`, and `destroy`.

## Query Patterns

### Fluent builder

Every query method returns a new immutable instance. Queries are `PromiseLike` — just `await` the chain.

```ts
// Find multiple
const products = await Product.find().where({ store: storeId }).sort('name asc').limit(10);

// Find one
const product = await Product.findOne().where({ id: 42 });

// Count
const count = await Product.count().where({ sku: { '!': null } });
```

### Where operators

```ts
// Comparison: <, <=, >, >=
.where({ price: { '>=': 100 } })

// Negation
.where({ status: { '!': 'discontinued' } })    // <> value
.where({ status: { '!': ['a', 'b'] } })        // NOT IN
.where({ deletedAt: { '!': null } })            // IS NOT NULL

// String matching (case-insensitive via ILIKE)
.where({ name: { contains: 'widget' } })        // %widget%
.where({ name: { startsWith: 'Pro' } })         // Pro%
.where({ name: { endsWith: 'ket' } })           // %ket
.where({ name: { like: 'W_dget%' } })           // raw ILIKE

// Array values (IN)
.where({ age: [22, 23, 24] })

// OR conditions
.where({ or: [{ firstName: 'Walter' }, { lastName: 'White' }] })

// Range (multiple operators on same field = AND)
.where({ createdAt: { '>=': startDate, '<': endDate } })
```

### JSONB querying

```ts
// Property equality
.where({ metadata: { theme: 'dark' } })

// Numeric comparison (auto-casts)
.where({ metadata: { retryCount: { '>=': 3 } } })

// Nested paths
.where({ metadata: { failure: { stage: 'transcription' } } })

// Containment
.where({ metadata: { contains: { type: 'recovery' } } })
```

### Pagination

```ts
// Manual
.skip(20).limit(10)

// Shorthand
.paginate(2, 25)   // page 2, 25 per page

// With total count (single query using COUNT(*) OVER())
const { results, totalCount } = await Product
  .find().where({}).sort('name').limit(10).skip(20).withCount();
```

### Populate (eager loading)

```ts
const product = await Product
  .findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });
// product.store is the full Store entity
```

### Joins

```ts
// Model join (INNER)
await Product
  .find()
  .join('store')
  .where({ store: { name: 'Acme' } });

// Left join
await Product
  .find()
  .leftJoin('store')
  .where({ store: { name: 'Acme' } });

// Subquery join with aggregates
const productCounts = subquery(Product)
  .select(['store', (sb) => sb.count().as('productCount')])
  .groupBy(['store']);

await Store
  .find()
  .join(productCounts, 'stats', { on: { id: 'store' } })
  .sort('stats.productCount desc');
```

### DISTINCT ON

```ts
// Most recently created product per store
await Product.find().distinctOn(['store']).sort('store').sort('createdAt desc');
```

ORDER BY must start with the DISTINCT ON columns. Cannot combine with `withCount()`.

### Create

```ts
// Single record — returns the created record
const product = await Product.create({ name: 'Widget', priceCents: 999 });

// Multiple records
const products = await Product.create([
  { name: 'Widget', priceCents: 999 },
  { name: 'Gadget', priceCents: 1499 },
]);

// Upsert: ON CONFLICT DO NOTHING
await Product.create({ name: 'Widget', sku: 'WDG-001' }, { onConflict: { action: 'ignore', targets: ['sku'] } });

// Upsert: ON CONFLICT DO UPDATE specific columns
await Product.create({ name: 'Widget', sku: 'WDG-001', priceCents: 999 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });

// Skip returning records
await Product.create({ name: 'Widget', priceCents: 999 }, { returnRecords: false });

// Return only specific columns (primary key always included)
await Product.create({ name: 'Widget', priceCents: 999 }, { returnSelect: ['name'] });
```

### Update

```ts
// Returns array of updated records
const products = await Product.update({ id: 42 }, { name: 'Super Widget' });

// Update multiple
const products = await Product.update({ id: [42, 43] }, { priceCents: 1299 });
```

### Destroy

```ts
// Returns array of deleted records
const products = await Product.destroy({ id: 42 });
```

### Subqueries

```ts
import { subquery } from 'bigal';

// WHERE IN
const activeStores = subquery(Store).select(['id']).where({ isActive: true });
await Product.find().where({ store: { in: activeStores } });

// WHERE EXISTS
const hasProducts = subquery(Product).where({ name: { like: 'Widget%' } });
await Store.find().where({ exists: hasProducts });

// Scalar comparison
const avgPrice = subquery(Product).avg('price');
await Product.find().where({ price: { '>': avgPrice } });
```

## Gotchas

### Collections must be optional

Collection properties (one-to-many, many-to-many) must use `?`, not `!`. They are only present after `.populate()`:

```ts
// Correct
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];

// Wrong — causes QueryResult type errors
@column({ collection: () => 'Product', via: 'store' })
public products!: Product[];
```

### NotEntity for JSON objects with id fields

If a JSON column contains objects with an `id` property, wrap the type with `NotEntity<T>` to prevent BigAl's type system from treating them as entities:

```ts
import type { NotEntity } from 'bigal';

interface IMyJsonType {
  id: string;
  foo: string;
}

@column({ type: 'json' })
public metadata?: NotEntity<IMyJsonType>;
```

### Query state is immutable

Each fluent method returns a new instance. Do not ignore the return value:

```ts
// Correct
const query = Product.find().where({ store: storeId });
const sorted = query.sort('name asc');
const results = await sorted.limit(10);

// Wrong — .sort() result is discarded
const query = Product.find().where({ store: storeId });
query.sort('name asc'); // This does nothing to `query`
const results = await query;
```

### QueryResult narrows relationship types

`QueryResult<T>` automatically narrows `number | Store` to `number`. Use `QueryResult<T>` (not `T`) for derived types:

```ts
import type { QueryResult } from 'bigal';

// Correct: store is `number`
type ProductSummary = Pick<QueryResult<Product>, 'id' | 'name' | 'store'>;

// Wrong: store is `number | Store`
type ProductSummaryWrong = Pick<Product, 'id' | 'name' | 'store'>;
```

### Debugging SQL

Set `DEBUG_BIGAL=true` to log all generated SQL and parameter values:

```sh
DEBUG_BIGAL=true node app.js
```

## Success Criteria

After applying this skill, verify:

- [ ] Models extend `Entity` and use `@table()`, `@primaryColumn()`, `@column()` decorators
- [ ] Queries use the fluent builder pattern (not raw SQL strings)
- [ ] CRUD uses Repository methods: `create()`, `update()`, `destroy()`
- [ ] Query chains are awaited (not fire-and-forget)
- [ ] Query state is treated as immutable (return values are used)
- [ ] Collection properties are optional (`?`)
- [ ] JSON column types with `id` fields use `NotEntity<T>`
- [ ] Model names in decorators are strings (`'Store'`) to avoid circular imports
- [ ] `QueryResult<T>` is used for derived types involving relationships

## Further Reading

- [Getting Started](https://bigalorm.github.io/bigal/getting-started) — install, first model, first query
- [Models](https://bigalorm.github.io/bigal/guide/models) — decorators, column options, relationships
- [Querying](https://bigalorm.github.io/bigal/guide/querying) — operators, pagination, JSONB, DISTINCT ON
- [CRUD Operations](https://bigalorm.github.io/bigal/guide/crud-operations) — create, update, destroy, upserts
- [Relationships](https://bigalorm.github.io/bigal/guide/relationships) — many-to-one, one-to-many, many-to-many, QueryResult
- [Subqueries and Joins](https://bigalorm.github.io/bigal/guide/subqueries-and-joins) — subquery builder, aggregates, GROUP BY
- [Views](https://bigalorm.github.io/bigal/guide/views) — readonly models and ReadonlyRepository
- [API Reference](https://bigalorm.github.io/bigal/reference/api) — all exports and method signatures
- [Configuration](https://bigalorm.github.io/bigal/reference/configuration) — pools, read replicas, multi-database
- [BigAl vs Raw SQL](https://bigalorm.github.io/bigal/advanced/bigal-vs-raw-sql) — decision framework
- [Known Issues](https://bigalorm.github.io/bigal/advanced/known-issues) — workarounds and debugging
