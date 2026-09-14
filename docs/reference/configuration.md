---
description: Configure connection pools (postgres-pool, pg, Neon), read replicas, multiple databases, and debug logging.
---

# Configuration

## Connection pools

BigAl requires a PostgreSQL connection pool that implements `PoolLike`.
Managed transactions additionally require `connect()` and a releasable client, represented by `TransactionPool`. Three drivers are supported:

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
Locking reads (`.lock()`) also use `pool`, because a replica cannot hold row locks.

Individual queries can override the pool:

```ts
const product = await productRepository
  .findOne({
    pool: writePool,
  })
  .where({ id: 42 });
```

Write operations accept the same override:

```ts
await productRepository.create({ name: 'Widget', store: storeId }, { pool: writeConnection });
await productRepository.update({ id: 42 }, { name: 'Renamed' }, { pool: writeConnection, returnRecords: false });
await productRepository.destroy({ id: 42 }, { pool: writeConnection });
```

Passing a pool changes only query routing. It does not begin or complete a transaction. See [Transactions](/guide/transactions) for managed and externally owned transaction patterns.

## Managed transaction pools

`transaction()` works with PostgreSQL pools whose `connect()` method returns a client with `query()` and `release()` methods.
This includes the pool APIs shown above. Query-only HTTP or batch executors can initialize repositories but cannot own an interactive managed transaction.

```ts
import { transaction } from 'bigal';

await transaction(
  {
    pool,
    repositories: { Product: productRepository },
  },
  async ({ repositories }) => repositories.Product.update({ id: 42 }, { name: 'Renamed' }),
);
```

Managed transactions always route scoped reads to the checked-out write connection, bypassing `readonlyPool` so reads can observe writes made earlier in the same transaction.

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
