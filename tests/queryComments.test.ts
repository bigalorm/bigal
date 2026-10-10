import { AsyncLocalStorage } from 'node:async_hooks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Repository, type TransactionConnection, type TransactionPool } from '../src/index.js';
import { initialize, transaction } from '../src/index.js';

import { Category, Product, ProductCategory, Store } from './models/index.js';
import * as generator from './utils/generator.js';
import { getQueryResult, type PoolQuery } from './utils/pool.js';

type ReleaseConnection = (removeConnection?: boolean) => Promise<void>;

const PRODUCT_COLUMNS_AND_TABLE = '"id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"';

describe('query comments', () => {
  const connection = {
    query: vi.fn<PoolQuery>(),
    release: vi.fn<ReleaseConnection>(),
  };
  const pool = {
    query: vi.fn<PoolQuery>(),
    connect: vi.fn<() => Promise<TransactionConnection>>(),
  };
  const requestContext = new AsyncLocalStorage<string>();
  const repositories = initialize({
    models: [Category, Product, ProductCategory, Store],
    pool: pool as TransactionPool & typeof pool,
    queryComment: () => requestContext.getStore(),
  });
  const ProductRepository = repositories.Product as Repository<Product>;
  const StoreRepository = repositories.Store as Repository<Store>;

  function getPoolQueries(): string[] {
    return pool.query.mock.calls.map(([query]) => query);
  }

  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
    pool.connect.mockResolvedValue(connection as TransactionConnection);
    connection.query.mockReset();
    connection.release.mockReset();
    connection.release.mockResolvedValue(undefined);
  });

  describe('per-query comments', () => {
    it('adds the comment to findOne()', async () => {
      const product = generator.product({ store: generator.store().id });
      pool.query.mockResolvedValueOnce(getQueryResult([product]));

      await ProductRepository.findOne().comment('loadProduct');

      expect(getPoolQueries()).toStrictEqual([`SELECT /* loadProduct */ ${PRODUCT_COLUMNS_AND_TABLE} LIMIT 1`]);
    });

    it('adds the comment to find()', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepository.find().comment('listProducts').sort('name').limit(10);

      expect(getPoolQueries()).toStrictEqual([`SELECT /* listProducts */ ${PRODUCT_COLUMNS_AND_TABLE} ORDER BY "name" LIMIT 10`]);
    });

    it('adds the comment to find().withCount() and toJSON()', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult([])).mockResolvedValueOnce(getQueryResult([]));

      await ProductRepository.find().withCount().comment('countedProducts');
      await ProductRepository.find().toJSON().comment('plainProducts');

      const [countedQuery, plainQuery] = getPoolQueries();
      expect(countedQuery).toMatch(/^SELECT \/\* countedProducts \*\/ .*count\(\*\) OVER\(\)/);
      expect(plainQuery).toBe(`SELECT /* plainProducts */ ${PRODUCT_COLUMNS_AND_TABLE}`);
    });

    it('adds the comment to count()', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult([{ count: '3' }])).mockResolvedValueOnce(getQueryResult([{ count: '3' }]));

      const result = await ProductRepository.count({ name: 'widget' }).comment('countWidgets');
      await ProductRepository.count().where({ name: 'widget' }).comment('countWidgets');

      expect(result).toBe(3);
      const expectedQuery = 'SELECT /* countWidgets */ count(*) AS "count" FROM "products" WHERE "name"=$1';
      expect(getPoolQueries()).toStrictEqual([expectedQuery, expectedQuery]);
    });

    it('adds the comment to create(), update(), and destroy()', async () => {
      const store = generator.store();
      pool.query.mockResolvedValue(getQueryResult([store]));

      await StoreRepository.create({ name: 'Main' }, { comment: 'openStore' });
      await StoreRepository.update({ id: store.id }, { name: 'Renamed' }, { comment: 'renameStore', returnRecords: false });
      await StoreRepository.destroy({ id: store.id }, { comment: 'closeStore' });

      const [createQuery, updateQuery, destroyQuery] = getPoolQueries();
      expect(createQuery).toMatch(/^INSERT \/\* openStore \*\/ INTO "stores" /);
      expect(updateQuery).toMatch(/^UPDATE \/\* renameStore \*\/ "stores" /);
      expect(destroyQuery).toMatch(/^DELETE \/\* closeStore \*\/ FROM "stores" /);
    });

    it('leaves queries unchanged without a comment', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepository.find();

      expect(getPoolQueries()).toStrictEqual([`SELECT ${PRODUCT_COLUMNS_AND_TABLE}`]);
    });

    it('applies the comment to single association populate queries', async () => {
      const store = generator.store();
      const product = generator.product({ store: store.id });
      pool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

      const result = await ProductRepository.findOne().populate('store').comment('loadProductWithStore');

      expect(result?.store).toStrictEqual(store);
      const queries = getPoolQueries();
      expect(queries).toHaveLength(2);
      expect(queries[1]).toMatch(/^SELECT \/\* loadProductWithStore \*\/ .* FROM "stores" /);
    });

    it('applies the comment to one-to-many populate queries', async () => {
      const store = generator.store();
      const product = generator.product({ store: store.id });
      pool.query.mockResolvedValueOnce(getQueryResult([store])).mockResolvedValueOnce(getQueryResult([product]));

      const result = await StoreRepository.findOne().comment('loadStoreWithProducts').populate('products');

      expect(result?.products).toStrictEqual([product]);
      const queries = getPoolQueries();
      expect(queries).toHaveLength(2);
      expect(queries[1]).toMatch(/^SELECT \/\* loadStoreWithProducts \*\/ .* FROM "products" /);
    });

    it('applies the comment to both many-to-many populate queries', async () => {
      const product = generator.product({ store: generator.store().id });
      const category = generator.category();
      pool.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([generator.productCategory(product, category)]))
        .mockResolvedValueOnce(getQueryResult([category]));

      const result = await ProductRepository.find().populate('categories').comment('listProductCategories');

      expect(result[0]?.categories).toStrictEqual([category]);
      const queries = getPoolQueries();
      expect(queries).toHaveLength(3);
      for (const query of queries) {
        expect(query).toMatch(/^SELECT \/\* listProductCategories \*\/ /);
      }
    });

    it.each(['bad */ DROP TABLE products', 'nested /* comment'])('rejects comment text containing a comment delimiter: %s', async (comment) => {
      await expect(ProductRepository.find().comment(comment)).rejects.toThrow('Query comment cannot contain "/*" or "*/"');
      await expect(StoreRepository.create({ name: 'Main' }, { comment })).rejects.toThrow('Query comment cannot contain "/*" or "*/"');

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('rejects a comment that is not a string', async () => {
      const untypedComment: unknown = JSON.parse('["*/ SELECT 42 AS count; --"]');

      await expect(ProductRepository.count().comment(untypedComment as string)).rejects.toThrow('Query comment must be a string');

      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('queryComment hook', () => {
    it('adds the hook comment before the per-query comment', async () => {
      pool.query.mockResolvedValueOnce(getQueryResult([]));

      await requestContext.run('route=GET /products', async () => ProductRepository.find().comment('listProducts'));

      expect(getPoolQueries()).toStrictEqual([`SELECT /* route=GET /products */ /* listProducts */ ${PRODUCT_COLUMNS_AND_TABLE}`]);
    });

    it('reads the hook for each query, including populate queries', async () => {
      const store = generator.store();
      const product = generator.product({ store: store.id });
      pool.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([store]))
        .mockResolvedValueOnce(getQueryResult([{ count: '1' }]));

      await requestContext.run('route=GET /products/:id', async () => ProductRepository.findOne().populate('store'));
      await requestContext.run('job=reindex', async () => ProductRepository.count());

      const [productQuery, storeQuery, countQuery] = getPoolQueries();
      expect(productQuery).toMatch(/^SELECT \/\* route=GET \/products\/:id \*\/ .* FROM "products" /);
      expect(storeQuery).toMatch(/^SELECT \/\* route=GET \/products\/:id \*\/ .* FROM "stores" /);
      expect(countQuery).toMatch(/^SELECT \/\* job=reindex \*\/ count\(\*\)/);
    });

    it.each([
      ['route=GET /files/*', 'route=GET /files/ *'],
      ['route=GET /files/*splat', 'route=GET /files/ *splat'],
      ['*/ DROP TABLE products; /*', '* / DROP TABLE products; / *'],
    ])('neutralizes comment delimiters in hook text: %s', async (hookText, expectedComment) => {
      pool.query.mockResolvedValueOnce(getQueryResult([]));

      await requestContext.run(hookText, async () => ProductRepository.find().comment('listFiles'));

      expect(getPoolQueries()).toStrictEqual([`SELECT /* ${expectedComment} */ /* listFiles */ ${PRODUCT_COLUMNS_AND_TABLE}`]);
    });

    it('applies the hook to repositories scoped to a managed transaction', async () => {
      connection.query.mockResolvedValue(getQueryResult([]));

      await requestContext.run('job=import', async () =>
        transaction({ pool: pool as TransactionPool & typeof pool, repositories: { Product: ProductRepository } }, async (transactionScope) =>
          transactionScope.repositories.Product.find().comment('importProducts'),
        ),
      );

      expect(connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', `SELECT /* job=import */ /* importProducts */ ${PRODUCT_COLUMNS_AND_TABLE}`, 'COMMIT']);
    });
  });
});
