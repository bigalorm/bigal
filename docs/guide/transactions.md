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

## Parameters and callback scope

`transaction(options, callback)` accepts:

| Option                       | Type                                                    | Required | Description                                                               |
| ---------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `pool`                       | `TransactionPool`                                       | Yes      | Write pool with `connect()` support                                       |
| `repositories`               | `Record<string, Repository \| ReadonlyRepository>`      | Yes      | Typed repositories from one `initialize()` call using the same write pool |
| `isolationLevel`             | `'readCommitted' \| 'repeatableRead' \| 'serializable'` | No       | PostgreSQL isolation level; the database default is retained when omitted |
| `lockTimeoutMs`              | `number`                                                | No       | Transaction-local maximum wait for any lock acquisition                   |
| `statementTimeoutMs`         | `number`                                                | No       | Transaction-local maximum duration for each statement                     |
| `idleInTransactionTimeoutMs` | `number`                                                | No       | Transaction-local maximum idle time before PostgreSQL closes the session  |

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

Readonly repositories stay readonly. Custom repository subclasses and wrappers are not rebound in this release; pass a standard repository or use a per-operation pool override.

## Raw SQL and existing helpers

The transaction scope implements `PoolLike`, so helpers that already accept a pool can use it:

```ts
await transaction({ pool, repositories }, async (transactionScope) => {
  await transactionScope.query('SELECT pg_advisory_xact_lock($1::bigint)', [resourceKey]);
  await auditRepository.create(auditValues, { pool: transactionScope });
});
```

A repository used with `{ pool: transactionScope }` must originate from the same write pool. A scoped repository rejects a different pool override.

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

| Mode            | PostgreSQL clause   | Use when                                                          |
| --------------- | ------------------- | ----------------------------------------------------------------- |
| `'noKeyUpdate'` | `FOR NO KEY UPDATE` | Coordinating ordinary updates without blocking foreign-key checks |
| `'update'`      | `FOR UPDATE`        | Deletion or referenced-key changes need protection                |

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
Population queries use the same transaction connection but do not inherit the primary query's lock clause.

Locking reads require either a managed transaction or an explicit pool override owned by an external transaction. Locks cannot be combined with `distinctOn()` or `withCount()`.

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

BigAl does not automatically retry, provide nested transactions or savepoints, or make external side effects atomic.
Perform external effects after `transaction()` resolves, or write an outbox record inside the transaction.
