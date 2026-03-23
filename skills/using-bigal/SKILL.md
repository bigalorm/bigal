---
name: using-bigal
description: >-
  Type-safe PostgreSQL ORM guidance for BigAl. Use when importing BigAl,
  defining models with table() or view(), writing WhereQuery filters,
  using Repository patterns, or deciding between BigAl and raw SQL.
  Covers model definition, fluent query building, joins, subqueries,
  pagination, JSONB querying, and common gotchas.
---

# Using BigAl

BigAl is a PostgreSQL-optimized, type-safe TypeScript ORM. It uses function-based models, a fluent
builder pattern for queries, and the Repository pattern for CRUD operations. All results are plain
objects.

## Quick Start

```ts
import { defineTable as table, serial, text, integer, belongsTo, initialize, subquery } from 'bigal';
import { Pool } from 'postgres-pool';

const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  store: belongsTo('Store'),
});

const pool = new Pool('postgres://localhost/mydb');
const { Product, Store } = initialize({ models: { Product, Store }, pool });

const products = await Product.find()
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

BigAl wraps your existing connection pool - `postgres-pool`, `pg`, or `@neondatabase/serverless`.
The pool is always accessible for raw queries, so you can eject to SQL at any point:

```ts
const { rows } = await pool.query('SELECT * FROM products WHERE tsv @@ plainto_tsquery($1)', ['search term']);
```

Use BigAl for the 90% of queries that fit its fluent API, and raw SQL for the rest.

## SQL-to-BigAl Translation Table

### Basic queries

| SQL                                                   | BigAl                                                    |
| ----------------------------------------------------- | -------------------------------------------------------- |
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

| SQL                                                         | BigAl                                      |
| ----------------------------------------------------------- | ------------------------------------------ |
| `INSERT INTO products (name) VALUES ('Widget') RETURNING *` | `Product.create({ name: 'Widget' })`       |
| `UPDATE products SET name = 'X' WHERE id = 1 RETURNING *`   | `Product.update({ id: 1 }, { name: 'X' })` |
| `DELETE FROM products WHERE id = 1 RETURNING *`             | `Product.destroy({ id: 1 })`               |

### Subqueries, joins, and advanced

| SQL                                                                             | BigAl                                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `WHERE store_id IN (SELECT id FROM stores WHERE active)`                        | `.where({ store: { in: subquery(Store).select(['id']).where({ active: true }) } })` |
| `INNER JOIN stores ON products.store_id = stores.id WHERE stores.name = 'Acme'` | `.join('store').where({ store: { name: 'Acme' } })`                                 |
| `SELECT DISTINCT ON (store_id) * ... ORDER BY store_id, created_at DESC`        | `.distinctOn(['store']).sort('store').sort('createdAt desc')`                       |
| `ON CONFLICT (sku) DO NOTHING`                                                  | `{ onConflict: { action: 'ignore', targets: ['sku'] } }`                            |
| `ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name`                          | `{ onConflict: { action: 'merge', targets: ['sku'], merge: ['name'] } }`            |

## Model Definition

### Defining a model

Models are defined with the `table()` function and PostgreSQL-native column builders. Types are
inferred from the schema definition. Column names are auto-derived from property keys using snakeCase.

```ts
import { defineTable as table, serial, text, varchar, integer, boolean, jsonb, createdAt, updatedAt, belongsTo, hasMany } from 'bigal';

export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  sku: varchar({ length: 100 }),
  priceCents: integer().notNull(),
  isActive: boolean().notNull().default(true),
  metadata: jsonb<{ color?: string }>(),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

### Column types

| Builder                  | PostgreSQL type  | TypeScript type     |
| ------------------------ | ---------------- | ------------------- |
| `serial()`               | SERIAL           | `number`            |
| `bigserial()`            | BIGSERIAL        | `number`            |
| `text()`                 | TEXT             | `string \| null`    |
| `varchar({ length })`    | VARCHAR(n)       | `string \| null`    |
| `integer()`              | INTEGER          | `number \| null`    |
| `bigint()`               | BIGINT           | `number \| null`    |
| `smallint()`             | SMALLINT         | `number \| null`    |
| `float()` / `real()`     | REAL             | `number \| null`    |
| `double()`               | DOUBLE PRECISION | `number \| null`    |
| `boolean()`              | BOOLEAN          | `boolean \| null`   |
| `timestamp()`            | TIMESTAMP        | `Date \| null`      |
| `timestamptz()`          | TIMESTAMPTZ      | `Date \| null`      |
| `date()`                 | DATE             | `Date \| null`      |
| `json<T>()`              | JSON             | `T \| null`         |
| `jsonb<T>()`             | JSONB            | `T \| null`         |
| `uuid()`                 | UUID             | `string \| null`    |
| `bytea()`                | BYTEA            | `Buffer \| null`    |
| `textArray()`            | TEXT[]           | `string[] \| null`  |
| `integerArray()`         | INTEGER[]        | `number[] \| null`  |
| `booleanArray()`         | BOOLEAN[]        | `boolean[] \| null` |
| `vector({ dimensions })` | VECTOR(n)        | `number[] \| null`  |
| `createdAt()`            | TIMESTAMPTZ      | `Date`              |
| `updatedAt()`            | TIMESTAMPTZ      | `Date`              |

### Column modifiers

```ts
name: text().notNull(),                         // removes null from type
isActive: boolean().notNull().default(true),     // optional on insert
id: serial().primaryKey(),                       // notNull + optional on insert
email: text().notNull().unique(),                // UNIQUE constraint
revision: integer().version(),                   // optimistic locking, auto-increments on update
```

### Relationships

**Many-to-one** - this model holds the foreign key:

```ts
store: belongsTo('Store'),
// FK column auto-derived as store_id

store: belongsTo('Store', { name: 'shop_id' }),
// Override FK column name
```

**One-to-many** - inverse side:

```ts
products: hasMany('Product').via('store'),
```

**Many-to-many** - via junction model:

```ts
categories: hasMany('Category').through('ProductCategory').via('product'),
```

Reference model names by string (`'Store'`, not `Store`) to avoid circular imports.

### Shared columns

```ts
const modelBase = { id: serial().primaryKey() };
const timestamps = { createdAt: createdAt(), updatedAt: updatedAt() };

export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
});
```

### Readonly models (views)

```ts
import { view, serial, text, integer } from 'bigal';

export const ProductSummary = view('product_summaries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  storeName: text().notNull(),
  categoryCount: integer().notNull(),
});
```

`initialize()` returns a `ReadonlyRepository` which exposes only `find()`, `findOne()`, and `count()`.

### Hooks

```ts
export const Product = table(
  'products',
  { id: serial().primaryKey(), name: text().notNull(), slug: text().notNull() },
  {
    hooks: {
      beforeCreate(values) {
        return { ...values, slug: slugify(values.name) };
      },
      afterFind(results) {
        return results;
      },
    },
  },
);
```

Available hooks: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDestroy`,
`afterDestroy`, `afterFind`.

### Global filters

```ts
const Product = table(
  'products',
  {
    /* columns */
  },
  {
    filters: {
      active: { isActive: true },
      notDeleted: () => ({ deletedAt: null }),
    },
  },
);

// Override per query
await Product.find().where({}).filters(false); // disable all
await Product.find().where({}).filters({ active: false }); // disable specific
```

### Type inference

```ts
import type { InferSelect, InferInsert, Repository, ReadonlyRepository } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;
type ProductInsert = InferInsert<(typeof Product)['schema']>;

function processProducts(repo: Repository<typeof Product>) {
  /* ... */
}
function readSummary(repo: ReadonlyRepository<typeof ProductSummary>) {
  /* ... */
}
```

## Initialization

```ts
import { initialize } from 'bigal';

// Object-style (recommended) -- typed destructuring
const { Product, Store } = initialize({
  models: { Product, Store, Category, ProductCategory },
  pool,
  readonlyPool, // optional: separate pool for reads
  connections: {
    // optional: multi-database
    audit: { pool: auditPool },
  },
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
  },
});

// Array-style -- use getRepository()
const bigal = initialize({ pool, models: [Product, Store] });
const ProductRepo = bigal.getRepository(Product);
```

## Query Patterns

### Fluent builder

Every query method returns a new immutable instance. Queries are `PromiseLike` - just `await` the chain.

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
const product = await Product.findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });
// product.store is the full Store entity
```

### Joins

```ts
// Model join (INNER)
await Product.find()
  .join('store')
  .where({ store: { name: 'Acme' } });

// Left join
await Product.find()
  .leftJoin('store')
  .where({ store: { name: 'Acme' } });

// Subquery join with aggregates
const productCounts = subquery(Product)
  .select(['store', (sb) => sb.count().as('productCount')])
  .groupBy(['store']);

await Store.find()
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
// Single record -- returns the created record
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
const avgPrice = subquery(Product).avg('priceCents');
await Product.find().where({ priceCents: { '>': avgPrice } });
```

### toSQL()

Inspect generated SQL without executing:

```ts
const { sql, params } = Product.find().where({ name: 'Widget' }).toSQL();
const { sql, params } = Product.create({ name: 'Widget', priceCents: 999 }).toSQL();
const { sql, params } = Product.update({ id: 42 }, { name: 'X' }).toSQL();
const { sql, params } = Product.destroy({ id: 42 }).toSQL();
```

### Vector distance queries

```ts
import { vector } from 'bigal';

// In model definition
embedding: vector({ dimensions: 1536 }),

// Sort by similarity
const similar = await Document.find()
  .where({})
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
  .limit(10);

// Filter by distance
const nearby = await Document.find()
  .where({ embedding: { nearestTo: queryVector, metric: 'cosine', distance: { '<': 0.5 } } })
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
  .limit(10);
```

## Gotchas

### Query state is immutable

Each fluent method returns a new instance. Do not ignore the return value:

```ts
// Correct
const query = Product.find().where({ store: storeId });
const sorted = query.sort('name asc');
const results = await sorted.limit(10);

// Wrong -- .sort() result is discarded
const query = Product.find().where({ store: storeId });
query.sort('name asc'); // This does nothing to `query`
const results = await query;
```

### QueryResult accepts TableDefinition directly

`QueryResult<typeof Model>` produces the row type with hasMany excluded and FKs narrowed:

```ts
import type { QueryResult } from 'bigal';

type ProductRow = QueryResult<typeof Product>;
type ProductSummary = Pick<QueryResult<typeof Product>, 'id' | 'name' | 'store'>;
```

### Debugging SQL

Use `onQuery` for structured logging, or set `DEBUG_BIGAL=true` for console output:

```sh
DEBUG_BIGAL=true node app.js
```

## Success Criteria

After applying this skill, verify:

- [ ] Models use `table()` with column builders (not decorators)
- [ ] Initialize uses object-style `models` with destructuring
- [ ] Queries use the fluent builder pattern (not raw SQL strings)
- [ ] CRUD uses Repository methods: `create()`, `update()`, `destroy()`
- [ ] Query chains are awaited (not fire-and-forget)
- [ ] Query state is treated as immutable (return values are used)
- [ ] Model names in relationships are strings (`'Store'`) to avoid circular imports
- [ ] `QueryResult<typeof Model>` is used for derived types involving relationships

## Further Reading

- [Getting Started](https://bigalorm.github.io/bigal/getting-started) - install, first model, first query
- [Models](https://bigalorm.github.io/bigal/guide/models) - table(), column types, relationships, hooks, filters
- [Querying](https://bigalorm.github.io/bigal/guide/querying) - operators, pagination, JSONB, DISTINCT ON
- [CRUD Operations](https://bigalorm.github.io/bigal/guide/crud-operations) - create, update, destroy, upserts
- [Relationships](https://bigalorm.github.io/bigal/guide/relationships) - belongsTo, hasMany, QueryResult
- [Subqueries and Joins](https://bigalorm.github.io/bigal/guide/subqueries-and-joins) - subquery builder, aggregates, GROUP BY
- [Views](https://bigalorm.github.io/bigal/guide/views) - readonly models and ReadonlyRepository
- [API Reference](https://bigalorm.github.io/bigal/reference/api) - all exports and method signatures
- [Configuration](https://bigalorm.github.io/bigal/reference/configuration) - pools, read replicas, multi-database
- [BigAl vs Raw SQL](https://bigalorm.github.io/bigal/advanced/bigal-vs-raw-sql) - decision framework
- [Known Issues](https://bigalorm.github.io/bigal/advanced/known-issues) - workarounds and debugging
