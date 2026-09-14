import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type PoolLike, type PoolQueryResult, type QueryResultRow, type Repository } from '../src/index.js';
import { initialize } from '../src/index.js';

import { Product, SimpleWithSchema, Store } from './models/index.js';
import * as generator from './utils/generator.js';

type PoolQuery = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool() {
  const pool = { query: vi.fn<PoolQuery>() };
  return pool as PoolLike & typeof pool;
}

function getQueryResult<TRow extends QueryResultRow>(rows: TRow[] = []): PoolQueryResult<TRow> {
  return {
    rowCount: rows.length,
    rows,
  };
}

describe('locking reads', () => {
  const pool = createMockPool();
  const repositories = initialize({ models: [Product, SimpleWithSchema, Store], pool });
  const ProductRepository = repositories.Product as Repository<Product>;
  const SimpleWithSchemaRepository = repositories.SimpleWithSchema as Repository<SimpleWithSchema>;

  beforeEach(() => {
    pool.query.mockReset();
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

  it('rejects locking reads without a managed scope or explicit pool override', async () => {
    await expect(ProductRepository.findOne().lock('update')).rejects.toThrow('explicit pool override');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects lock combinations with withCount in either builder order', async () => {
    await expect(ProductRepository.find({ pool }).lock('update').withCount()).rejects.toThrow('cannot be combined');
    await expect(ProductRepository.find({ pool }).withCount().lock('update')).rejects.toThrow('cannot be combined');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects lock combinations with distinctOn after JSON conversion', async () => {
    await expect(ProductRepository.find({ pool }).sort('store').distinctOn(['store']).lock('update').toJSON()).rejects.toThrow('cannot be combined');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('leaves ordinary read SQL unchanged', async () => {
    pool.query.mockResolvedValueOnce(getQueryResult());

    await ProductRepository.find().where({ id: 42 });

    expect(pool.query.mock.calls[0]?.[0]).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1');
  });
});
