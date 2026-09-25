---
description: Run managed PostgreSQL transactions with typed repositories, explicit row locks, isolation levels, and transaction-local timeouts.
---

# Transactions

BigAl can acquire one connection, bind ordinary repositories to it, and manage `BEGIN`, `COMMIT`, `ROLLBACK`, and release for you. Queries inside the callback keep their existing syntax and types.

```ts
import { transaction } from 'bigal';

const repositories = {
  Product: productRepository,
  Store: storeRepository,
};

const product = await transaction({ pool, repositories }, async (transactionScope) => {
  const { Product, Store } = transactionScope.repositories;
  const store = await Store.create({ name: 'Warehouse' });

  return Product.create({ name: 'Widget', store: store.id });
});
```

The callback result is returned after the commit succeeds. Throwing from the callback, or encountering a database query error, rolls the transaction back.
For clients with `on` and `removeListener`, BigAl also handles fatal connection errors, including an expired idle transaction timeout, and discards the failed connection.
Queries attempted after that failure reject with the recorded database error, preserving its SQLSTATE when the driver provides one.
The timeout closes the database session; it does not cancel external work already running inside the callback.
Keep the application's pool-level error handler: drivers such as `postgres-pool` can also forward checked-out client errors to the pool.
Adapters exposing only `query()` and `release()` remain supported and must report their connection failures through rejected queries.

## Parameters and callback scope

`transaction(options, callback)` accepts:

| Option                       | Type                                                    | Required | Description                                                                    |
| ---------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `pool`                       | `TransactionPool`                                       | Yes      | Write pool with `connect()` support                                            |
| `repositories`               | `Record<string, Repository \| ReadonlyRepository>`      | Yes      | Standard repositories whose write pool is `pool`, from any `initialize()` call |
| `isolationLevel`             | `'readCommitted' \| 'repeatableRead' \| 'serializable'` | No       | PostgreSQL isolation level; the database default is retained when omitted      |
| `lockTimeoutMs`              | `number`                                                | No       | Transaction-local maximum wait for any lock acquisition                        |
| `statementTimeoutMs`         | `number`                                                | No       | Transaction-local maximum duration for each statement                          |
| `idleInTransactionTimeoutMs` | `number`                                                | No       | Transaction-local maximum idle time before PostgreSQL closes the session       |

Timeout values must be integers from `0` through `2_147_483_647`. An explicit `0` disables that PostgreSQL timeout for the transaction.
BigAl supplies no timeout defaults and emits no timeout-setting SQL for omitted options.

The callback receives:

| Property       | Type                                      | Description                                                    |
| -------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `repositories` | Same keys and model capabilities as input | Fresh repositories routed to the checked-out connection        |
| `query()`      | `PoolLike['query']`                       | Guarded, parameterized SQL escape hatch on the same connection |

Repository keys are preserved, including custom names:

```ts
await transaction(
  {
    pool,
    repositories: {
      inventory: productRepository,
      locations: storeRepository,
    },
  },
  async ({ repositories }) => {
    const store = await repositories.locations.findOne().where({ id: storeId });
    if (!store) throw new Error('Store not found');

    return repositories.inventory.update({ id: productId }, { store: store.id });
  },
);
```

Readonly repositories stay readonly. Custom repository subclasses and wrappers are rejected with a `TypeError`; pass the underlying standard repository or use a per-operation pool override.

## Raw SQL and existing helpers

The transaction scope implements `PoolLike`, so helpers that already accept a pool can use it:

```ts
await transaction({ pool, repositories }, async (transactionScope) => {
  await transactionScope.query('SELECT pg_advisory_xact_lock($1::bigint)', [resourceKey]);
  await auditRepository.create(auditValues, { pool: transactionScope });
});
```

A repository used with `{ pool: transactionScope }` must use the same write pool as the transaction. A scoped repository accepts its own scope as an override and rejects any other pool.
Population inherits that managed connection. An explicit `populate(..., { pool })` override must refer to the same transaction scope.
This also applies when the parent query uses a global repository with `{ pool: transactionScope }`.

## Row locking

Use an explicit lock when a decision spans multiple statements and cannot be expressed with a database constraint or atomic conditional update.

```ts
await transaction(
  {
    pool,
    repositories,
    lockTimeoutMs: 2_000,
    statementTimeoutMs: 5_000,
  },
  async ({ repositories: { Product, Store } }) => {
    const store = await Store.findOne().where({ id: storeId }).lock('noKeyUpdate');
    if (!store) throw new Error('Store not found');

    const productCount = await Product.count({ where: { store: store.id } });
    if (productCount >= capacity) throw new Error('Store capacity reached');

    return Product.create({ name: 'Widget', store: store.id });
  },
);
```

Available lock modes:

| Mode            | PostgreSQL clause   | Use when                                                                |
| --------------- | ------------------- | ----------------------------------------------------------------------- |
| `'update'`      | `FOR UPDATE`        | Deletion or referenced-key changes need protection                      |
| `'noKeyUpdate'` | `FOR NO KEY UPDATE` | Coordinating ordinary updates without blocking foreign-key checks       |
| `'share'`       | `FOR SHARE`         | Reading rows that must not change until commit, alongside other readers |
| `'keyShare'`    | `FOR KEY SHARE`     | Rows must not be deleted or have their key changed; updates may proceed |

Share modes let several transactions lock the same row at once while blocking writers that conflict with them.
`'share'` blocks every update and delete of the row, while `'keyShare'` blocks only deletes and key changes, as a foreign-key check does.

The optional `wait` behavior is `'nowait'` or `'skipLocked'`:

```ts
const jobs = await jobRepository.find({
  pool: transactionConnection,
  where: { status: 'queued' },
  lock: { mode: 'update', wait: 'skipLocked' },
  limit: 10,
});

const product = await productRepository.findOne({ pool: transactionConnection }).where({ id: productId }).lock('update', { wait: 'nowait' });
```

Locking is opt-in. Ordinary reads, including reads inside managed transactions, remain ordinary `SELECT` statements.
If a model has a column named `lock`, shorthand `find({ lock: value })` and `findOne({ lock: value })` filter that column, even when its JSON value contains `mode`.
Request a row lock with the fluent `.lock()` method or an explicit options wrapper such as `{ where: {}, lock: { mode: 'update' } }`.
An undefined `lock` option is treated as omitted.
Population queries use the same transaction connection but do not inherit the primary query's lock clause.
Related models and junction tables must use the transaction's write pool, even when omitted from the public `repositories` map.
Repositories on other pools are excluded from the managed scope; attempting to populate them raises a missing-repository error before their SQL runs.

A locking read runs on the write pool, or on the `pool` override you pass, never on a read replica.
PostgreSQL releases a row lock when the transaction ends, so a lock taken outside a transaction block is released as soon as the statement completes.
Take locks through scoped repositories, through repositories initialized with a transaction connection, or with a `{ pool: connection }` override on a global repository.
Locks cannot be combined with `distinctOn()` or `withCount()`.

### Locking discipline

- Keep the transaction short. Do network calls, slow computation, and user interaction before entering it.
- Prefer constraints or a conditional `update()` for single-row state transitions.
- Acquire multiple resources in a consistent table and primary-key order.
- A query locks only rows it finds. Lock an existing parent row when coordinating creation of child rows.
- Every writer participating in a business invariant must use the same locking protocol.
- Handle deadlocks, lock timeouts, and serialization failures by retrying the whole transaction only when the complete operation is safe to repeat.

## Existing transaction owners

If application code already acquires a connection and owns the lifecycle, initialize local repositories with that connection:

```ts
const connection = await pool.connect();

try {
  await connection.query('BEGIN');

  const transactionRepositories = initialize({
    models: [Product, Store],
    pool: connection,
  });

  await transactionRepositories.Product.update({ id: productId }, { name: 'Renamed widget' });
  await connection.query('COMMIT');
} catch (error) {
  await connection.query('ROLLBACK');
  throw error;
} finally {
  await connection.release();
}
```

Include models needed by relationships and junctions, and do not configure a read replica for these local repositories.
Repositories initialized this way can use `.lock()` directly because every query already runs on the transaction connection.
`initialize()` does not begin, commit, roll back, release, or invalidate an externally owned connection.
It retains its existing broad repository-map return type, so use your application's established typed wrapper or assertion for model-specific properties.

Alternatively, route individual operations to that connection:

```ts
await productRepository.create({ name: 'Widget', store: storeId }, { pool: connection });
await productRepository.update({ id: productId }, { name: 'Renamed widget' }, { pool: connection, returnRecords: false });
await productRepository.destroy({ id: obsoleteProductIds }, { pool: connection });
```

Passing `pool` changes only where the operation executes. It does not start or finish a transaction.

## Lifetime and composition

Pass scoped repositories or the scope itself into helpers instead of capturing global repositories.
Queries started after the callback completes are rejected, including saved lazy builders and raw `query()` calls.

Return or await every query from the callback. A callback that completes while already-started database work is pending fails rather than committing around unfinished work.
Cleanup waits for those queries before rolling back and releasing the connection, even when the callback throws.
An application timeout such as `Promise.race()` does not cancel a database query; use `lockTimeoutMs` or `statementTimeoutMs` to bound its wait.

BigAl does not automatically retry, provide nested transactions or savepoints, or make external side effects atomic.
Perform external effects after `transaction()` resolves, or write an outbox record inside the transaction.
