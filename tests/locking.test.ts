import { beforeEach, describe, expect, it } from 'vitest';

import { type Repository } from '../src/index.js';
import { initialize } from '../src/index.js';

import { Product, SimpleWithSchema, Store } from './models/index.js';
import { LockValue } from './models/LockValue.js';
import * as generator from './utils/generator.js';
import { createMockPool, getQueryResult } from './utils/pool.js';

describe('locking reads', () => {
  const pool = createMockPool();
  const readonlyPool = createMockPool();
  const repositories = initialize({ models: [LockValue, Product, SimpleWithSchema, Store], pool, readonlyPool });
  const LockValueRepository = repositories.LockValue as Repository<LockValue>;
  const ProductRepository = repositories.Product as Repository<Product>;
  const SimpleWithSchemaRepository = repositories.SimpleWithSchema as Repository<SimpleWithSchema>;

  beforeEach(() => {
    pool.query.mockReset();
    readonlyPool.query.mockReset();
  });

  describe.each(['find', 'findOne'] as const)('%s lock argument compatibility', (method) => {
    it.each([
      { criteria: { lock: { mode: 'update' } }, expectedParams: ['update'] },
      { criteria: { lock: { mode: 'update' }, id: 42 }, expectedParams: ['update', 42] },
      { criteria: { id: 42, lock: { mode: 'update' } }, expectedParams: [42, 'update'] },
      { criteria: { lock: { mode: 'update' }, select: 'saved' }, expectedParams: ['update', 'saved'] },
      { criteria: { select: 'saved', lock: { mode: 'update' } }, expectedParams: ['saved', 'update'] },
    ])('preserves JSON lock-column shorthand: $criteria', async ({ criteria, expectedParams }) => {
      readonlyPool.query.mockResolvedValueOnce(getQueryResult());

      await LockValueRepository[method](criteria);

      const [query, params] = readonlyPool.query.mock.calls[0]!;
      expect(query).toContain(' WHERE ');
      expect(query).toContain('"lock"->>\'mode\'=$');
      expect(params).toStrictEqual(expectedParams);
      expect(query).not.toContain(' FOR ');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('recognizes an explicit options wrapper even when the model has a lock column', async () => {
      pool.query.mockResolvedValue(getQueryResult());

      await LockValueRepository[method]({ where: { id: 42 }, lock: { mode: 'update' } });
      await LockValueRepository[method]({ lock: { mode: 'update' }, where: { id: 42 } });

      for (const [query, params] of pool.query.mock.calls) {
        expect(query).toContain('WHERE "id"=$1');
        expect(query).toContain('FOR UPDATE OF "lock_values"');
        expect(params).toStrictEqual([42]);
      }

      expect(readonlyPool.query).not.toHaveBeenCalled();
    });

    it('treats an undefined optional lock as omitted in options', async () => {
      readonlyPool.query.mockResolvedValue(getQueryResult());

      await ProductRepository[method]({ where: { id: 42 }, lock: undefined });
      await ProductRepository[method]({ lock: undefined, where: { id: 42 } });
      await LockValueRepository[method]({ where: { id: 42 }, lock: undefined });
      await LockValueRepository[method]({ lock: undefined, where: { id: 42 } });

      for (const [query, params] of readonlyPool.query.mock.calls) {
        expect(query).toContain('WHERE "id"=$1');
        expect(query).not.toContain(' FOR ');
        expect(params).toStrictEqual([42]);
      }

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('supports unfiltered lock-only options without a lock column', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult());

      await ProductRepository[method]({ lock: { mode: 'update' } });

      expect(pool.query.mock.calls[0]?.[0]).toContain('FOR UPDATE OF "products"');
      expect(pool.query.mock.calls[0]?.[1]).toStrictEqual([]);
      expect(readonlyPool.query).not.toHaveBeenCalled();
    });

    it('can add a fluent lock to JSON lock-column criteria', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult());

      await LockValueRepository[method]({ lock: { mode: 'update' } }).lock('noKeyUpdate');

      expect(pool.query.mock.calls[0]?.[0]).toContain(' WHERE ');
      expect(pool.query.mock.calls[0]?.[0]).toContain('FOR NO KEY UPDATE OF "lock_values"');
      expect(pool.query.mock.calls[0]?.[1]).toContain('update');
      expect(readonlyPool.query).not.toHaveBeenCalled();
    });
  });

  it('adds an update lock only when requested through options', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.find({
      pool,
      where: { id: [1, 2] },
      lock: { mode: 'update', wait: 'nowait' },
      limit: 2,
    });

    expect(pool.query.mock.calls[0]?.[0]).toBe(
      'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=ANY($1::INTEGER[]) LIMIT 2 FOR UPDATE OF "products" NOWAIT',
    );
  });

  it('supports no-key-update and skip-locked through the fluent builder', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.find({ pool })
      .where({ id: [1, 2] })
      .lock('noKeyUpdate', { wait: 'skipLocked' });

    expect(pool.query.mock.calls[0]?.[0]).toContain('FOR NO KEY UPDATE OF "products" SKIP LOCKED');
  });

  it('supports share and key-share locks through options and the fluent builder', async () => {
    pool.query.mockResolvedValue(getQueryResult());

    await ProductRepository.find({ where: { id: [1, 2] }, lock: { mode: 'share' } });
    await ProductRepository.findOne().where({ id: 1 }).lock('keyShare', { wait: 'nowait' });

    expect(pool.query.mock.calls[0]?.[0]).toMatch(/ FOR SHARE OF "products"$/);
    expect(pool.query.mock.calls[1]?.[0]).toMatch(/ FOR KEY SHARE OF "products" NOWAIT$/);
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it('uses the unqualified visible table name for schema-qualified models', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await SimpleWithSchemaRepository.findOne({ pool }).lock('update');

    expect(pool.query.mock.calls[0]?.[0]).toBe('SELECT "id","name" FROM "foo"."simple" LIMIT 1 FOR UPDATE OF "simple"');
  });

  it('locks only the base table when joins filter the query', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.find({ pool })
      .join('store')
      .where({ store: { name: 'Warehouse' } })
      .lock('update');

    expect(pool.query.mock.calls[0]?.[0]).toContain('FOR UPDATE OF "products"');
    expect(pool.query.mock.calls[0]?.[0]).not.toContain('FOR UPDATE OF "stores"');
  });

  it('does not pass the locking clause into population queries', async () => {
    const store = generator.store();
    const product = generator.product({ store: store.id });
    pool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

    await ProductRepository.findOne({ pool }).where({ id: product.id }).populate('store').lock('update');

    expect(pool.query.mock.calls[0]?.[0]).toContain('FOR UPDATE OF "products"');
    expect(pool.query.mock.calls[1]?.[0]).not.toContain(' FOR ');
  });

  it('routes a locking read to the write pool instead of the read-only pool', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.findOne().where({ id: 42 }).lock('update');

    expect(pool.query.mock.calls[0]?.[0]).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1 FOR UPDATE OF "products"');
    expect(readonlyPool.query).not.toHaveBeenCalled();
  });

  it('routes a locking read through a repository initialized with a transaction connection', async () => {
    const connection = createMockPool();
    const connectionRepositories = initialize({ models: [Product, Store], pool: connection });
    const ConnectionProductRepository = connectionRepositories.Product as Repository<Product>;
    connection.query.mockResolvedValueOnce(getQueryResult());

    await ConnectionProductRepository.find({ where: { id: [1, 2] }, lock: { mode: 'update', wait: 'skipLocked' } });

    expect(connection.query.mock.calls[0]?.[0]).toContain('FOR UPDATE OF "products" SKIP LOCKED');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects lock combinations with withCount', async () => {
    await expect(ProductRepository.find({ pool }).lock('update').withCount()).rejects.toThrow('cannot be combined');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects lock combinations with distinctOn after JSON conversion', async () => {
    await expect(ProductRepository.find({ pool }).sort('store').distinctOn(['store']).lock('update').toJSON()).rejects.toThrow('cannot be combined');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('leaves ordinary read SQL unchanged and on the read-only pool', async () => {
    readonlyPool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.find().where({ id: 42 });

    expect(readonlyPool.query.mock.calls[0]?.[0]).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
