import assert from 'node:assert';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type PoolQueryResult, type QueryResultRow, type Repository, type TransactionConnection, type TransactionPool, type TransactionScope } from '../src/index.js';
import { initialize, transaction } from '../src/index.js';

import { Category, Product, ProductCategory, ReadonlyProduct, Store } from './models/index.js';
import { ProductWithRemoteStore } from './models/ProductWithRemoteStore.js';
import { RemoteStore } from './models/RemoteStore.js';
import * as generator from './utils/generator.js';
import { createMockPool, getQueryResult, type PoolQuery } from './utils/pool.js';

type ReleaseConnection = (removeConnection?: boolean) => Promise<void>;

function createTransactionHarness() {
  const connection = {
    query: vi.fn<PoolQuery>(),
    release: vi.fn<ReleaseConnection>(),
  };
  connection.release.mockResolvedValue(undefined);
  const poolQuery = vi.fn<PoolQuery>();
  const pool = {
    query: poolQuery,
    connect: vi.fn<() => Promise<TransactionConnection>>(),
  };
  pool.connect.mockResolvedValue(connection as TransactionConnection);

  return {
    connection: connection as TransactionConnection & typeof connection,
    pool: pool as TransactionPool & typeof pool,
  };
}

describe('transaction', () => {
  const transactionHarness = createTransactionHarness();
  const readonlyPool = createMockPool();
  const repositories = initialize({
    models: [Category, Product, ProductCategory, ReadonlyProduct, Store],
    pool: transactionHarness.pool,
    readonlyPool,
  });
  const ProductRepository = repositories.Product as Repository<Product>;
  const ReadonlyProductRepository = repositories.ReadonlyProduct!;
  const StoreRepository = repositories.Store as Repository<Store>;

  beforeEach(() => {
    transactionHarness.connection.query.mockReset();
    transactionHarness.connection.release.mockReset();
    transactionHarness.pool.connect.mockClear();
    transactionHarness.pool.query.mockReset();
    readonlyPool.query.mockReset();
  });

  it('commits dependent repository operations on one acquired connection', async () => {
    const store = generator.store();
    const product = generator.product({ store: store.id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([store]))
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const result = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: {
          Product: ProductRepository,
          Store: StoreRepository,
        },
      },
      async (transactionScope) => {
        expect(transactionScope.repositories.Product).not.toBe(ProductRepository);
        expect(transactionScope.repositories.Store).not.toBe(StoreRepository);

        const createdStore = await transactionScope.repositories.Store.create({ name: store.name });
        return transactionScope.repositories.Product.create({ name: product.name, store: createdStore.id });
      },
    );

    expect(result).toStrictEqual(product);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual([
      'BEGIN',
      'INSERT INTO "stores" ("name") VALUES ($1) RETURNING "id","name"',
      'INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"',
      'COMMIT',
    ]);
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
    expect(readonlyPool.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(false);
  });

  it('routes ordinary reads to the transaction connection without adding locks', async () => {
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => transactionScope.repositories.Product.findOne({ id: product.id }),
    );

    expect(transactionHarness.connection.query.mock.calls[1]?.[0]).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it('routes population through the scoped registry when related repositories are omitted from the public map', async () => {
    const store = generator.store();
    const product = generator.product({ store: store.id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult([store]))
      .mockResolvedValueOnce(getQueryResult());

    const populatedProduct = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => transactionScope.repositories.Product.findOne({ id: product.id }).populate('store'),
    );

    expect(populatedProduct?.store).toStrictEqual(store);
    expect(transactionHarness.connection.query).toHaveBeenCalledTimes(4);
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it('routes an omitted many-to-many junction through the scoped registry', async () => {
    const store = generator.store();
    const product = generator.product({ store: store.id });
    const category = generator.category();
    const productCategory = generator.productCategory(product, category);
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult([productCategory]))
      .mockResolvedValueOnce(getQueryResult([category]))
      .mockResolvedValueOnce(getQueryResult());

    const populatedProduct = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => transactionScope.repositories.Product.findOne({ id: product.id }).populate('categories'),
    );

    expect(populatedProduct?.categories).toStrictEqual([category]);
    expect(transactionHarness.connection.query).toHaveBeenCalledTimes(5);
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it.each(['findOne', 'find'] as const)('rejects cross-connection population with %s before querying the other pool', async (method) => {
    const secondaryPool = createMockPool();
    const remoteRepositories = initialize({
      models: [ProductWithRemoteStore, RemoteStore],
      pool: transactionHarness.pool,
      connections: { secondary: { pool: secondaryPool } },
    });
    const productRepository = remoteRepositories.ProductWithRemoteStore as Repository<ProductWithRemoteStore>;
    const store = generator.store();
    const product = generator.product({ store: store.id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());
    secondaryPool.query.mockResolvedValue(getQueryResult([store]));

    const operation = transaction({ pool: transactionHarness.pool, repositories: { Product: productRepository } }, async (scope) => {
      if (method === 'findOne') {
        return scope.repositories.Product.findOne({ id: product.id }).populate('store');
      }

      return scope.repositories.Product.find({ where: { id: product.id } }).populate('store');
    });

    await expect(operation).rejects.toThrow('Unable to find populate repository by entity name: RemoteStore');
    expect(secondaryPool.query).not.toHaveBeenCalled();
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', expect.stringContaining('SELECT'), 'ROLLBACK']);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(false);
  });

  it('keeps ordinary cross-connection population available outside managed transactions', async () => {
    const secondaryPool = createMockPool();
    const remoteRepositories = initialize({
      models: [ProductWithRemoteStore, RemoteStore],
      pool: transactionHarness.pool,
      connections: { secondary: { pool: secondaryPool } },
    });
    const productRepository = remoteRepositories.ProductWithRemoteStore as Repository<ProductWithRemoteStore>;
    const store = generator.store();
    const product = generator.product({ store: store.id });
    transactionHarness.pool.query.mockResolvedValue(getQueryResult([product]));
    secondaryPool.query.mockResolvedValue(getQueryResult([store]));

    const populatedProduct = await productRepository.findOne({ id: product.id }).populate('store');

    expect(populatedProduct?.store).toBeInstanceOf(RemoteStore);
    expect(populatedProduct?.store).toMatchObject({ id: store.id, name: store.name });
    expect(secondaryPool.query).toHaveBeenCalledOnce();
    expect(transactionHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('allows scoped reads with unrelated models on another connection', async () => {
    const secondaryPool = createMockPool();
    const remoteRepositories = initialize({
      models: [ProductWithRemoteStore, RemoteStore],
      pool: transactionHarness.pool,
      connections: { secondary: { pool: secondaryPool } },
    });
    const productRepository = remoteRepositories.ProductWithRemoteStore as Repository<ProductWithRemoteStore>;
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const result = await transaction({ pool: transactionHarness.pool, repositories: { Product: productRepository } }, (scope) => scope.repositories.Product.findOne({ id: product.id }));

    expect(result?.store).toBe(product.store);
    expect(secondaryPool.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', expect.stringContaining('SELECT'), 'COMMIT']);
  });

  it('rejects collection population on another connection before querying that pool', async () => {
    const otherPool = createMockPool();
    const remoteRepositories = initialize({
      models: [Product, RemoteStore],
      pool: otherPool,
      connections: { secondary: { pool: transactionHarness.pool } },
    });
    const storeRepository = remoteRepositories.RemoteStore as Repository<RemoteStore>;
    const store = generator.store();
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([store]))
      .mockResolvedValueOnce(getQueryResult());

    const operation = transaction({ pool: transactionHarness.pool, repositories: { Store: storeRepository } }, (scope) => scope.repositories.Store.findOne({ id: store.id }).populate('products'));

    await expect(operation).rejects.toThrow('Unable to find populate repository for collection by name Product');
    expect(otherPool.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', expect.stringContaining('SELECT'), 'ROLLBACK']);
  });

  it('supports locking reads inside a managed transaction', async () => {
    const store = generator.store();
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([store]))
      .mockResolvedValueOnce(getQueryResult());

    await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Store: StoreRepository },
      },
      async (transactionScope) => transactionScope.repositories.Store.findOne().where({ id: store.id }).lock('noKeyUpdate'),
    );

    expect(transactionHarness.connection.query.mock.calls[1]?.[0]).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1 FOR NO KEY UPDATE OF "stores"');
  });

  it('rolls back callback failures and preserves the original error', async () => {
    const callbackError = new Error('callback failed');
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockResolvedValueOnce(getQueryResult());

    const operation = transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      () => {
        throw callbackError;
      },
    );

    await expect(operation).rejects.toBe(callbackError);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'ROLLBACK']);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(false);
  });

  it('rolls back a database failure even when the callback catches it', async () => {
    const queryError = Object.assign(new Error('statement failed'), { code: '55P03' });
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockRejectedValueOnce(queryError).mockResolvedValueOnce(getQueryResult());

    const operation = transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => {
        await transactionScope.query('SELECT broken').catch(() => undefined);
        return 'caught';
      },
    );

    await expect(operation).rejects.toBe(queryError);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'SELECT broken', 'ROLLBACK']);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(false);
  });

  it('applies only explicitly supplied transaction-local settings', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());

    const result = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: {},
        isolationLevel: 'repeatableRead',
        lockTimeoutMs: 0,
        statementTimeoutMs: 5_000,
        idleInTransactionTimeoutMs: 2_147_483_647,
      },
      () => 42,
    );

    expect(result).toBe(42);
    expect(transactionHarness.connection.query.mock.calls).toStrictEqual([
      ['BEGIN ISOLATION LEVEL REPEATABLE READ'],
      [
        'SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true)',
        ['lock_timeout', '0ms', 'statement_timeout', '5000ms', 'idle_in_transaction_session_timeout', '2147483647ms'],
      ],
      ['COMMIT'],
    ]);
  });

  it('does not emit timeout configuration SQL when settings are omitted', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());

    await transaction({ pool: transactionHarness.pool, repositories: {} }, () => undefined);

    expect(transactionHarness.connection.query.mock.calls).toStrictEqual([['BEGIN'], ['COMMIT']]);
  });

  it('rolls back without invoking the callback when timeout setup fails', async () => {
    const setupError = new Error('unable to set timeout');
    const callback = vi.fn<() => void>();
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockRejectedValueOnce(setupError).mockResolvedValueOnce(getQueryResult());

    const operation = transaction(
      {
        pool: transactionHarness.pool,
        repositories: {},
        statementTimeoutMs: 1_000,
      },
      callback,
    );

    await expect(operation).rejects.toBe(setupError);
    expect(callback).not.toHaveBeenCalled();
    expect(transactionHarness.connection.query.mock.calls).toStrictEqual([['BEGIN'], ['SELECT set_config($1, $2, true)', ['statement_timeout', '1000ms']], ['ROLLBACK']]);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(false);
  });

  it.each([-1, 1.5, Number.POSITIVE_INFINITY, 2_147_483_648])('rejects invalid timeout values before acquiring a connection: %s', async (lockTimeoutMs) => {
    await expect(transaction({ pool: transactionHarness.pool, repositories: {}, lockTimeoutMs }, () => undefined)).rejects.toBeInstanceOf(RangeError);
    expect(transactionHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('rejects an invalid idle transaction timeout before acquiring a connection', async () => {
    await expect(transaction({ pool: transactionHarness.pool, repositories: {}, idleInTransactionTimeoutMs: 2_147_483_648 }, () => undefined)).rejects.toBeInstanceOf(RangeError);
    expect(transactionHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('rejects an unsupported isolation level before acquiring a connection', async () => {
    const invalidIsolationLevel = 'readUncommitted' as never;

    await expect(transaction({ pool: transactionHarness.pool, repositories: {}, isolationLevel: invalidIsolationLevel }, () => undefined)).rejects.toThrow('Unsupported transaction isolation level');
    expect(transactionHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('rejects saved scopes after completion without reusing the released connection', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());
    let savedScope: TransactionScope<{ Product: Repository<Product> }> | undefined;

    await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      (transactionScope) => {
        savedScope = transactionScope;
      },
    );

    assert(savedScope);
    await expect(savedScope.query('SELECT 1')).rejects.toThrow('scope has closed');
    expect(transactionHarness.connection.query).toHaveBeenCalledTimes(2);
  });

  it('rejects lazy builders first awaited after the scope completes', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());
    let savedBuilder: ReturnType<Repository<Product>['findOne']> | undefined;

    await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      (transactionScope) => {
        savedBuilder = transactionScope.repositories.Product.findOne({ id: 42 });
      },
    );

    assert(savedBuilder);
    await expect(savedBuilder).rejects.toThrow('scope has closed');
    expect(transactionHarness.connection.query).toHaveBeenCalledTimes(2);
  });

  it('allows existing helpers to use the managed scope as a pool override', async () => {
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const createdProduct = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => ProductRepository.create({ name: product.name, store: product.store }, { pool: transactionScope }),
    );

    expect(createdProduct).toStrictEqual(product);
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
  });

  it('allows a pool override from another initialization that shares the write pool', async () => {
    const otherRepositories = initialize({ models: [Product, Store], pool: transactionHarness.pool });
    const OtherProductRepository = otherRepositories.Product as Repository<Product>;
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const createdProduct = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => OtherProductRepository.create({ name: product.name, store: product.store }, { pool: transactionScope }),
    );

    expect(createdProduct).toStrictEqual(product);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', expect.stringContaining('INSERT INTO "products"'), 'COMMIT']);
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
  });

  it('allows pool overrides on global repositories when the transaction has no repositories', async () => {
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const createdProduct = await transaction({ pool: transactionHarness.pool, repositories: {} }, async (transactionScope) => {
      await transactionScope.query('SELECT pg_advisory_xact_lock($1::bigint)', [42]);
      return ProductRepository.create({ name: product.name, store: product.store }, { pool: transactionScope });
    });

    expect(createdProduct).toStrictEqual(product);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual([
      'BEGIN',
      'SELECT pg_advisory_xact_lock($1::bigint)',
      expect.stringContaining('INSERT INTO "products"'),
      'COMMIT',
    ]);
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
  });

  it('accepts its own scope as a pool override on a scoped repository', async () => {
    const product = generator.product({ store: generator.store().id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const foundProduct = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => transactionScope.repositories.Product.findOne({ pool: transactionScope, where: { id: product.id } }),
    );

    expect(foundProduct).toStrictEqual(product);
    expect(transactionHarness.connection.query).toHaveBeenCalledTimes(3);
  });

  it('rejects a conflicting pool override on a scoped repository', async () => {
    const otherPool = createMockPool();
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());

    const operation = transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository },
      },
      async (transactionScope) => transactionScope.repositories.Product.findOne({ pool: otherPool }),
    );

    await expect(operation).rejects.toThrow('cannot use a different pool');
    expect(otherPool.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'ROLLBACK']);
  });

  it('rejects repositories from another pool before acquiring a connection', async () => {
    const otherHarness = createTransactionHarness();

    await expect(
      transaction(
        {
          pool: otherHarness.pool,
          repositories: { Product: ProductRepository },
        },
        () => undefined,
      ),
    ).rejects.toThrow('different connection');
    expect(otherHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('scopes repositories from separate initializations that share the write pool', async () => {
    const otherRepositories = initialize({ models: [Product, Store], pool: transactionHarness.pool });
    const OtherStoreRepository = otherRepositories.Store as Repository<Store>;
    const store = generator.store();
    const product = generator.product({ store: store.id });
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockResolvedValueOnce(getQueryResult([store]))
      .mockResolvedValueOnce(getQueryResult([product]))
      .mockResolvedValueOnce(getQueryResult());

    const result = await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { Product: ProductRepository, Store: OtherStoreRepository },
      },
      async (transactionScope) => {
        expect(transactionScope.repositories.Store).not.toBe(OtherStoreRepository);

        const createdStore = await transactionScope.repositories.Store.create({ name: store.name });
        return transactionScope.repositories.Product.create({ name: product.name, store: createdStore.id });
      },
    );

    expect(result).toStrictEqual(product);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual([
      'BEGIN',
      expect.stringContaining('INSERT INTO "stores"'),
      expect.stringContaining('INSERT INTO "products"'),
      'COMMIT',
    ]);
  });

  it('rejects unsupported repository wrappers before acquiring a connection', async () => {
    const wrappedRepository = { repository: ProductRepository };

    await expect(
      transaction(
        {
          pool: transactionHarness.pool,
          repositories: { Product: wrappedRepository },
        },
        () => undefined,
      ),
    ).rejects.toThrow('standard Repository or ReadonlyRepository');
    expect(transactionHarness.pool.connect).not.toHaveBeenCalled();
  });

  it('rejects starting a managed transaction from a transaction scope', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());

    const operation = transaction({ pool: transactionHarness.pool, repositories: {} }, async (transactionScope) =>
      transaction({ pool: transactionScope as unknown as TransactionPool, repositories: {} }, () => undefined),
    );

    await expect(operation).rejects.toThrow('cannot be started from another managed transaction scope');
    expect(transactionHarness.pool.connect).toHaveBeenCalledOnce();
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'ROLLBACK']);
  });

  it('preserves read-only repository capabilities in the scoped map', async () => {
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());

    await transaction(
      {
        pool: transactionHarness.pool,
        repositories: { ReadonlyProduct: ReadonlyProductRepository },
      },
      (transactionScope) => {
        expect(transactionScope.repositories.ReadonlyProduct).toBeInstanceOf(Object);
        expect('create' in transactionScope.repositories.ReadonlyProduct).toBe(false);
      },
    );
  });

  it('discards the connection when rollback fails without replacing the primary error', async () => {
    const callbackError = new Error('primary failure');
    const rollbackError = new Error('rollback failure');
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockRejectedValueOnce(rollbackError);

    const operation = transaction(
      {
        pool: transactionHarness.pool,
        repositories: {},
      },
      () => {
        throw callbackError;
      },
    );

    await expect(operation).rejects.toBe(callbackError);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(true);
    expect((callbackError as Error & { cleanupErrors?: unknown[] }).cleanupErrors).toStrictEqual([rollbackError]);
  });

  it('fails instead of committing while a started query is pending', async () => {
    const pendingQuery = Promise.withResolvers<PoolQueryResult<QueryResultRow>>();
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockReturnValueOnce(pendingQuery.promise).mockResolvedValueOnce(getQueryResult());
    setImmediate(() => pendingQuery.resolve(getQueryResult()));

    const operation = transaction({ pool: transactionHarness.pool, repositories: {} }, (transactionScope) => {
      void transactionScope.query('SELECT pending');
    });

    await expect(operation).rejects.toThrow('operations were still pending');
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'SELECT pending', 'ROLLBACK']);
  });

  it.each(['scoped', 'override'])('waits for a pending %s repository read before rollback and release', async (routing) => {
    const queryStarted = Promise.withResolvers<void>();
    const pendingQuery = Promise.withResolvers<PoolQueryResult<QueryResultRow>>();
    transactionHarness.connection.query
      .mockResolvedValueOnce(getQueryResult())
      .mockImplementationOnce(() => {
        queryStarted.resolve();
        return pendingQuery.promise;
      })
      .mockResolvedValueOnce(getQueryResult());

    const operation = transaction({ pool: transactionHarness.pool, repositories: { Product: ProductRepository } }, async (scope) => {
      const query = routing === 'scoped' ? scope.repositories.Product.findOne({ id: 1 }) : ProductRepository.findOne({ where: { id: 1 }, pool: scope });
      void query.then(
        () => undefined,
        () => undefined,
      );
      await queryStarted.promise;
      setImmediate(() => {
        expect(transactionHarness.connection.release).not.toHaveBeenCalled();
        pendingQuery.resolve(getQueryResult());
      });
    });

    await expect(operation).rejects.toThrow('operations were still pending');
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', expect.stringContaining('SELECT'), 'ROLLBACK']);
    expect(transactionHarness.connection.release).toHaveBeenCalledOnce();
    expect(transactionHarness.pool.query).not.toHaveBeenCalled();
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it('discards a connection after an uncertain commit failure', async () => {
    const commitError = new Error('commit transport failure');
    transactionHarness.connection.query.mockResolvedValueOnce(getQueryResult()).mockRejectedValueOnce(commitError).mockResolvedValueOnce(getQueryResult());

    const operation = transaction({ pool: transactionHarness.pool, repositories: {} }, () => 'result');

    await expect(operation).rejects.toBe(commitError);
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(true);
  });

  it('reports a release failure after an acknowledged commit', async () => {
    const releaseError = new Error('release failed');
    transactionHarness.connection.query.mockResolvedValue(getQueryResult());
    transactionHarness.connection.release.mockRejectedValueOnce(releaseError);

    await expect(transaction({ pool: transactionHarness.pool, repositories: {} }, () => 'result')).rejects.toThrow('transaction committed');
    expect(transactionHarness.connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'COMMIT']);
  });

  it('discards an acquired connection when begin fails', async () => {
    const beginError = new Error('begin failed');
    transactionHarness.connection.query.mockRejectedValueOnce(beginError);

    await expect(transaction({ pool: transactionHarness.pool, repositories: {} }, () => undefined)).rejects.toBe(beginError);
    expect(transactionHarness.connection.query).toHaveBeenCalledOnce();
    expect(transactionHarness.connection.release).toHaveBeenCalledWith(true);
  });

  it('does not try to clean up when connection acquisition fails', async () => {
    const acquisitionError = new Error('connection unavailable');
    transactionHarness.pool.connect.mockRejectedValueOnce(acquisitionError);

    await expect(transaction({ pool: transactionHarness.pool, repositories: {} }, () => undefined)).rejects.toBe(acquisitionError);
    expect(transactionHarness.connection.query).not.toHaveBeenCalled();
    expect(transactionHarness.connection.release).not.toHaveBeenCalled();
  });
});
