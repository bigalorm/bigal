import { beforeEach, describe, expect, it } from 'vitest';

import { type Repository } from '../src/index.js';
import { initialize } from '../src/index.js';

import { Product, Store } from './models/index.js';
import * as generator from './utils/generator.js';
import { createMockPool, getQueryResult } from './utils/pool.js';

describe('write pool overrides', () => {
  const defaultPool = createMockPool();
  const overridePool = createMockPool();
  const repositories = initialize({ models: [Product, Store], pool: defaultPool });
  const ProductRepository = repositories.Product as Repository<Product>;

  beforeEach(() => {
    defaultPool.query.mockReset();
    overridePool.query.mockReset();
  });

  it('routes a single create with pool-only options and preserves its result', async () => {
    const product = generator.product({ store: generator.store().id });
    overridePool.query.mockResolvedValueOnce(getQueryResult([product]));

    const result = await ProductRepository.create({ name: product.name, store: product.store }, { pool: overridePool });

    expect(result).toStrictEqual(product);
    expect(overridePool.query).toHaveBeenCalledOnce();
    expect(defaultPool.query).not.toHaveBeenCalled();
  });

  it('routes a bulk create with pool-only options and preserves its array result', async () => {
    const products = [generator.product({ store: generator.store().id }), generator.product({ store: generator.store().id })];
    overridePool.query.mockResolvedValueOnce(getQueryResult(products));

    const result = await ProductRepository.create(
      products.map(({ name, store }) => ({ name, store })),
      { pool: overridePool },
    );

    expect(result).toStrictEqual(products);
    expect(defaultPool.query).not.toHaveBeenCalled();
  });

  it('routes updates with pool-only options and retains returned records by default', async () => {
    const product = generator.product({ store: generator.store().id });
    overridePool.query.mockResolvedValueOnce(getQueryResult([product]));

    const result = await ProductRepository.update({ id: product.id }, { name: product.name }, { pool: overridePool });

    expect(result).toStrictEqual([product]);
    expect(defaultPool.query).not.toHaveBeenCalled();
  });

  it('routes destroys with pool-only options and returns no records by default', async () => {
    overridePool.query.mockResolvedValueOnce(getQueryResult());

    const result = await ProductRepository.destroy({ id: 42 }, { pool: overridePool });

    expect(result).toBeUndefined();
    expect(overridePool.query.mock.calls[0]?.[0]).toBe('DELETE FROM "products" WHERE "id"=$1');
    expect(defaultPool.query).not.toHaveBeenCalled();
  });

  it('keeps returnRecords false and conflict options compatible with a pool override', async () => {
    overridePool.query.mockResolvedValueOnce(getQueryResult());

    const result = await ProductRepository.create(
      { name: 'Widget', store: 42 },
      {
        pool: overridePool,
        returnRecords: false,
        onConflict: {
          action: 'ignore',
          targets: ['name'],
        },
      },
    );

    expect(result).toBeUndefined();
    expect(overridePool.query.mock.calls[0]?.[0]).toContain('ON CONFLICT ("name") DO NOTHING');
    expect(defaultPool.query).not.toHaveBeenCalled();
  });
});
