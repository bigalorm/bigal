---
description: Configure connection pools (postgres-pool, pg, Neon), read replicas, multiple databases, and debug logging.
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

const repos = initialize({ models, pool });
```

### node-postgres (pg)

```ts
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://user:pass@localhost/mydb',
});

const repos = initialize({ models, pool });
```

### Neon serverless

```ts
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const repos = initialize({ models, pool });
```

## Read replicas

Separate read and write pools by passing `readonlyPool`:

```ts
const pool = new Pool('postgres://localhost/mydb');
const readonlyPool = new Pool('postgres://readonly-host/mydb');

const repos = initialize({
  models,
  pool,
  readonlyPool,
});
```

`find()`, `findOne()`, and `count()` use `readonlyPool`. `create()`, `update()`, and `destroy()` use `pool`.

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
@table({ name: 'audit_logs', connection: 'audit' })
export class AuditLog extends Entity {
  // ...
}

const repos = initialize({
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

## Expose callback

The `expose` callback is invoked for each repository after creation:

```ts
const repos = initialize({
  models,
  pool,
  expose(repository, tableMetadata) {
    console.log(`Initialized ${tableMetadata.name}`);
  },
});
```

## Debugging

Set the `DEBUG_BIGAL` environment variable to log generated SQL:

```sh
DEBUG_BIGAL=true node app.js
```
