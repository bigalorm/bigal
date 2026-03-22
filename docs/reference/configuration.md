---
description: Configure connection pools (postgres-pool, pg, Neon), read replicas, multiple databases, and query observability.
---

# Configuration

## Connection pools

BigAl requires a PostgreSQL connection pool that implements `PoolLike`. Three drivers are supported:

### postgres-pool (recommended)

```ts
import { Pool } from 'postgres-pool';
import { initialize } from 'bigal';

const pool = new Pool({
  connectionString: 'postgres://user:pass@localhost/mydb',
});

const { Product } = initialize({ models: { Product }, pool });
```

### node-postgres (pg)

```ts
import pg from 'pg';
import { initialize } from 'bigal';

const pool = new pg.Pool({
  connectionString: 'postgres://user:pass@localhost/mydb',
});

const { Product } = initialize({ models: { Product }, pool });
```

### Neon serverless

```ts
import { Pool } from '@neondatabase/serverless';
import { initialize } from 'bigal';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const { Product } = initialize({ models: { Product }, pool });
```

## Read replicas

Separate read and write pools by passing `readonlyPool`:

```ts
const pool = new Pool('postgres://localhost/mydb');
const readonlyPool = new Pool('postgres://readonly-host/mydb');

const { Product } = initialize({
  models: { Product },
  pool,
  readonlyPool,
});
```

`find()`, `findOne()`, and `count()` use `readonlyPool`. `create()`, `update()`, and `destroy()` use
`pool`.

Individual queries can override the pool:

```ts
const product = await Product.findOne({
  pool: writePool,
}).where({ id: 42 });
```

## Multiple databases

Use named connections for models that live in different databases:

```ts
const AuditLog = table(
  'audit_logs',
  {
    /* columns */
  },
  { connection: 'audit' },
);

const { Product, AuditLog } = initialize({
  models: { Product, AuditLog },
  pool: mainPool,
  connections: {
    audit: {
      pool: auditPool,
      readonlyPool: auditReadonlyPool,
    },
  },
});
```

Models without a `connection` option use the top-level `pool`.

## Models: object vs array

`initialize()` accepts models as either an object or an array:

### Object-style (recommended)

Returns typed repositories directly via destructuring. No type assertions needed:

```ts
const { Product, Store } = initialize({
  pool,
  models: { Product, Store, Category, ProductCategory },
});
```

### Array-style

Returns an object with `getRepository()` and `getReadonlyRepository()` methods:

```ts
const bigal = initialize({
  pool,
  models: [Product, Store, Category, ProductCategory],
});

const Product = bigal.getRepository(Product);
const ProductSummary = bigal.getReadonlyRepository(ProductSummary);
```

## Global filters

Define named filters on table definitions that are automatically applied to every `find` and `findOne`
query:

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
```

Filters can be static objects or functions that return a where clause dynamically. Override per query:

```ts
// Disable all filters
await Product.find().where({}).filters(false);

// Disable a specific filter
await Product.find().where({}).filters({ active: false });
```

## Query observability

### onQuery callback

Pass an `onQuery` callback to `initialize()` for structured query logging:

```ts
const { Product } = initialize({
  pool,
  models: { Product },
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
    if (error) {
      logger.error({ sql, error, model });
    }
  },
});
```

The callback receives an `OnQueryEvent` for every query:

| Property    | Type                 | Description                                           |
| ----------- | -------------------- | ----------------------------------------------------- |
| `sql`       | `string`             | The generated SQL statement                           |
| `params`    | `readonly unknown[]` | Query parameter values                                |
| `duration`  | `number`             | Execution time in milliseconds                        |
| `error`     | `Error \| undefined` | Error if the query failed                             |
| `model`     | `string`             | Model name                                            |
| `operation` | `string`             | One of: find, findOne, count, create, update, destroy |

The callback is wrapped in a try/catch internally -- exceptions in `onQuery` will not crash your
queries. When no `onQuery` is provided, there is zero overhead.

**Note:** `params` may contain sensitive data (user input, passwords, etc.). Use appropriate care when
logging.

### DEBUG_BIGAL environment variable

The `DEBUG_BIGAL` environment variable still works as a fallback. When set and no `onQuery` callback
is provided, BigAl logs generated SQL to the console:

```sh
DEBUG_BIGAL=true node app.js
```

For production use, prefer the `onQuery` callback for structured, configurable logging.
