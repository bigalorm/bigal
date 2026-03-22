---
description: Configure connection pools (postgres-pool, pg, Neon), read replicas, multiple databases, and query observability.
---

# Configuration

## Connection pools

BigAl requires a PostgreSQL connection pool that implements `PoolLike`. Three drivers are supported:

### postgres-pool (recommended)

```ts
import { Pool } from 'postgres-pool';
import { createBigAl } from 'bigal';

const pool = new Pool({
  connectionString: 'postgres://user:pass@localhost/mydb',
});

const bigal = createBigAl({ models, pool });
```

### node-postgres (pg)

```ts
import pg from 'pg';
import { createBigAl } from 'bigal';

const pool = new pg.Pool({
  connectionString: 'postgres://user:pass@localhost/mydb',
});

const bigal = createBigAl({ models, pool });
```

### Neon serverless

```ts
import { Pool } from '@neondatabase/serverless';
import { createBigAl } from 'bigal';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const bigal = createBigAl({ models, pool });
```

## Read replicas

Separate read and write pools by passing `readonlyPool`:

```ts
const pool = new Pool('postgres://localhost/mydb');
const readonlyPool = new Pool('postgres://readonly-host/mydb');

const bigal = createBigAl({
  models,
  pool,
  readonlyPool,
});
```

`find()`, `findOne()`, and `count()` use `readonlyPool`. `create()`, `update()`, and `destroy()` use
`pool`.

Individual queries can override the pool:

```ts
const product = await productRepository
  .findOne({
    pool: writePool,
  })
  .where({ id: 42 });
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

const bigal = createBigAl({
  models: [Product, AuditLog],
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

## Query observability

### onQuery callback

Pass an `onQuery` callback to `createBigAl()` for structured query logging:

```ts
const bigal = createBigAl({
  pool,
  models,
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
| `model`     | `string`             | Table name                                            |
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
