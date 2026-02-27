import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type CreateUpdateParams, type PoolLike, type PoolQueryResult, type QueryResult, type QueryResultRow, type Repository } from '../src/index.js';
import { initialize } from '../src/index.js';

import { Category, Product, ProductCategory, ProductWithCreateUpdateDateTracking, SimpleWithStringCollection, Store } from './models/index.js';
import * as generator from './utils/generator.js';
import { pick } from './utils/pick.js';

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool() {
  const pool = { query: vi.fn<PoolQueryFn>() };
  return pool as PoolLike & typeof pool;
}

function getQueryResult<T extends QueryResultRow>(rows: T[] = []): PoolQueryResult<T> & { command: string; oid: number; fields: never[] } {
  return {
    command: 'select',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

describe('Repository', () => {
  const mockedPool = createMockPool();

  let ProductRepository: Repository<Product>;
  let ProductCategoryRepository: Repository<ProductCategory>;
  let SimpleWithStringCollectionRepository: Repository<SimpleWithStringCollection>;
  let StoreRepository: Repository<Store>;
  let ProductWithCreateUpdateDateTrackingRepository: Repository<ProductWithCreateUpdateDateTracking>;

  beforeAll(() => {
    const repositoriesByModelName = initialize({
      models: [Category, Product, ProductCategory, ProductWithCreateUpdateDateTracking, SimpleWithStringCollection, Store],
      pool: mockedPool,
    });

    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ProductCategoryRepository = repositoriesByModelName.ProductCategory as Repository<ProductCategory>;
    SimpleWithStringCollectionRepository = repositoriesByModelName.SimpleWithStringCollection as Repository<SimpleWithStringCollection>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
    ProductWithCreateUpdateDateTrackingRepository = repositoriesByModelName.ProductWithCreateUpdateDateTracking as Repository<ProductWithCreateUpdateDateTracking>;
  });

  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  describe('#create()', () => {
    let store: QueryResult<Store>;

    beforeEach(() => {
      store = generator.store();
    });

    it('should execute beforeCreate if defined as a schema method', async () => {
      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            id: 42,
          },
        ]),
      );

      await ProductWithCreateUpdateDateTrackingRepository.create({
        name: 'foo',
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      const [, params] = mockedPool.query.mock.calls[0]!;

      assert(params);
      expect(params).toStrictEqual(['beforeCreate - foo', []]);
    });

    it('should return single object result if single value is specified', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: product.store,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should return single object result if single value is specified - Promise.all', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const [result] = await Promise.all([
        ProductRepository.create({
          name: product.name,
          store: product.store,
        }),
      ]);

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should return void if single value is specified and returnRecords=false', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          returnRecords: false,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3)');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support ignoring on conflict', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'ignore',
            targets: ['name'],
          },
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO NOTHING RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"',
      );
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support ignoring on conflict with returnRecords=false', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'ignore',
            targets: ['name'],
          },
          returnRecords: false,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO NOTHING');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support ignoring on conflict with specified returnSelect', async () => {
      const product = generator.product({
        store: store.id,
      });

      const returnValue = pick(product, ['id', 'name']);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([returnValue]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'ignore',
            targets: ['name'],
          },
          returnSelect: ['id', 'name'],
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      // eslint-disable-next-line vitest/prefer-strict-equal
      expect(result).toEqual(returnValue);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO NOTHING RETURNING "id","name"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support merge on conflict', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'merge',
            targets: ['name'],
            merge: ['name'],
          },
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name" RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"',
      );
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support merging on conflict with returnRecords=false', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'merge',
            targets: ['name', 'store'],
            merge: ['name', 'sku', 'aliases'],
          },
          returnRecords: false,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name","store_id") DO UPDATE SET "name"=EXCLUDED."name","sku"=EXCLUDED."sku","alias_names"=EXCLUDED."alias_names"',
      );
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support merging on conflict with specified returnSelect', async () => {
      const product = generator.product({
        store: store.id,
      });

      const returnValue = pick(product, ['id', 'name']);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([returnValue]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          onConflict: {
            action: 'merge',
            targets: ['name'],
            merge: ['name'],
          },
          returnSelect: ['id', 'name'],
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      // eslint-disable-next-line vitest/prefer-strict-equal
      expect(result).toEqual(returnValue);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name" RETURNING "id","name"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should return empty array results if empty value array is specified', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const result = await ProductRepository.create([]);

      expect(mockedPool.query).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toStrictEqual([]);
    });

    it('should return object array results if multiple values are specified', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.create(
        products.map((product) => {
          return {
            name: product.name,
            store: product.store,
          };
        }),
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"',
      );
      assert(params);
      expect(params).toStrictEqual([products[0]!.name, products[1]!.name, [], [], products[0]!.store, products[1]!.store]);
    });

    it('should return void if multiple values are specified and returnRecords=false', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.create(
        products.map((product) => {
          return {
            name: product.name,
            store: product.store,
          };
        }),
        {
          returnRecords: false,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)');
      assert(params);
      expect(params).toStrictEqual([products[0]!.name, products[1]!.name, [], [], products[0]!.store, products[1]!.store]);
    });

    it('should allow populated value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], store.id]);
    });

    it('should allow populated (QueryResult) value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsQueryResult: QueryResult<Store> = {
        ...store,
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: storeAsQueryResult,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], store.id]);
    });

    it('should allow partial Entity (omitting some required fields) as a value parameter', async () => {
      const category = generator.category();
      const product: Pick<Product, 'id' | 'name'> = generator.product({
        store: store.id,
      });
      const productCategory = generator.productCategory(product, category);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([productCategory]));

      const result = await ProductCategoryRepository.create({
        product,
        category,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      // eslint-disable-next-line vitest/prefer-strict-equal
      expect(result).toEqual(productCategory);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "product__category" ("product_id","category_id") VALUES ($1,$2) RETURNING "id","product_id" AS "product","category_id" AS "category","ordering","is_primary" AS "isPrimary"',
      );
      assert(params);
      expect(params).toStrictEqual([product.id, category.id]);
    });

    it(`should allow populated (Pick<T, 'id'>) value parameters`, async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsPickId: Pick<Store, 'id'> = {
        id: store.id,
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: storeAsPickId,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], store.id]);
    });

    it('should insert with string array value parameter', async () => {
      const item = generator.simpleWithStringCollection();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([item]));

      const createParams: CreateUpdateParams<SimpleWithStringCollection> = {
        name: item.name,
      };
      createParams.otherIds = item.otherIds;

      const result = await SimpleWithStringCollectionRepository.create(createParams);

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(item);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "simple" ("name","other_ids") VALUES ($1,$2) RETURNING "id","name","other_ids" AS "otherIds"');
      assert(params);
      expect(params).toStrictEqual([item.name, item.otherIds]);
    });

    it('should ignore one-to-many collection values', async () => {
      const product: Product = generator.product({
        store: store.id,
      });
      product.categories = [];

      mockedPool.query.mockResolvedValueOnce(getQueryResult([store]));
      // Excess property check is bypassed via variable to test that collection values are ignored at runtime
      const valuesWithCollection = { name: store.name, products: [product] };
      const result = await StoreRepository.create(valuesWithCollection);

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(store);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "stores" ("name") VALUES ($1) RETURNING "id","name"');
      assert(params);
      expect(params).toStrictEqual([store.name]);
    });

    it('should ignore many-to-many collection values', async () => {
      const category = generator.category();
      const product: Product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      // Excess property check is bypassed via variable to test that collection values are ignored at runtime
      const valuesWithCollection = { name: product.name, store: product.store, categories: [category] };
      const result = await ProductRepository.create(valuesWithCollection);

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    describe('toJSON()', () => {
      it('should return plain object without prototype chain for single create', async () => {
        const product = generator.product({
          store: store.id,
        });

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

        const result = await ProductRepository.create({
          name: product.name,
          store: store.id,
        }).toJSON();

        expect(result).toBeDefined();
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(result.name).toBe(product.name);
      });

      it('should return plain objects without prototype chain for array create', async () => {
        const products = [generator.product({ store: store.id }), generator.product({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.create([
          { name: products[0]!.name, store: store.id },
          { name: products[1]!.name, store: store.id },
        ]).toJSON();

        expect(result).toHaveLength(2);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result[1]!)).toBe(Object.prototype);
      });

      it('should work with returnSelect option', async () => {
        const product = generator.product({
          store: store.id,
        });

        mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: product.id, name: product.name }]));

        const result = await ProductRepository.create(
          {
            name: product.name,
            store: store.id,
          },
          { returnSelect: ['name'] },
        ).toJSON();

        expect(result).toBeDefined();
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      });
    });
  });

  describe('#update()', () => {
    let store: QueryResult<Store>;

    beforeEach(() => {
      store = generator.store();
    });

    it('should execute beforeUpdate if defined as a schema method', async () => {
      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            id: 42,
          },
        ]),
      );

      const id = faker.number.int();

      await ProductWithCreateUpdateDateTrackingRepository.update(
        {
          id,
        },
        {
          name: 'foo',
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      const [, params] = mockedPool.query.mock.calls[0]!;

      assert(params);
      expect(params).toStrictEqual(['beforeUpdate - foo', id]);
    });

    it('should return array of updated objects if second parameter is not defined', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: product.store,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toStrictEqual([product]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, product.store, product.id]);
    });

    it('should return array of updated objects if second parameter is not defined - Promise.all', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const [results] = await Promise.all([
        ProductRepository.update(
          {
            id: product.id,
          },
          {
            name: product.name,
            store: product.store,
          },
        ),
      ]);

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(results).toStrictEqual([product]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, product.store, product.id]);
    });

    it('should return void if returnRecords=false', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: product.store,
        },
        {
          returnRecords: false,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3');
      assert(params);
      expect(params).toStrictEqual([product.name, product.store, product.id]);
    });

    it('should allow populated (QueryResult) value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsQueryResult: QueryResult<Store> = {
        ...store,
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const results = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: storeAsQueryResult,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(results).toStrictEqual([product]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, store.id, product.id]);
    });

    it(`should allow populated (Pick<T, 'id'>) value parameters`, async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsPickId: Pick<Store, 'id'> = {
        id: store.id,
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const results = await ProductRepository.update(
        {
          id: product,
        },
        {
          name: product.name,
          store: storeAsPickId,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(results).toStrictEqual([product]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, store.id, product.id]);
    });

    it('should allow partial Entity (omitting some required fields) as a value parameter', async () => {
      const category = generator.category();
      const product: Pick<Product, 'id' | 'name'> = generator.product({
        store: store.id,
      });
      const productCategory = generator.productCategory(product, category);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([productCategory]));

      const results = await ProductCategoryRepository.update(
        {
          id: productCategory.id,
        },
        {
          product,
          category,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      // eslint-disable-next-line vitest/prefer-strict-equal
      expect(results).toEqual([productCategory]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'UPDATE "product__category" SET "product_id"=$1,"category_id"=$2 WHERE "id"=$3 RETURNING "id","product_id" AS "product","category_id" AS "category","ordering","is_primary" AS "isPrimary"',
      );
      assert(params);
      expect(params).toStrictEqual([product.id, category.id, productCategory.id]);
    });

    describe('toJSON()', () => {
      it('should return plain objects without prototype chain', async () => {
        const products = [generator.product({ store: store.id }), generator.product({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.update({ store: store.id }, { name: 'updated' }).toJSON();

        expect(result).toHaveLength(2);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result[1]!)).toBe(Object.prototype);
      });

      it('should work with returnSelect option', async () => {
        const products = [{ id: 1, name: 'updated' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.update({ id: 1 }, { name: 'updated' }, { returnSelect: ['name'] }).toJSON();

        expect(result).toHaveLength(1);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });
    });
  });

  describe('#destroy()', () => {
    let store: QueryResult<Store>;

    beforeEach(() => {
      store = generator.store();
    });

    it('should delete all records and return void if there are no constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy();
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should delete all records if empty constraint and return all data if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnRecords: true });
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should delete all records if empty constraint and return specific columns if returnSelect is specified', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnSelect: ['name'] });
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" RETURNING "name","id"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should delete all records if empty constraint and return id column if returnSelect is empty', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnSelect: [] });
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" RETURNING "id"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call constraints as a parameter', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy({
        id: products.map((item) => item.id),
        store,
      });
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call constraints as a parameter if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy(
        {
          id: products.map((item) => item.id),
          store,
        },
        { returnRecords: true },
      );
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call with chained where constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy().where({
        store: store.id,
      });
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained where constraints if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.destroy({}, { returnRecords: true }).where({
        store: store.id,
      });
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "store_id"=$1 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained where constraints - Promise.all', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.destroy().where({
          store: store.id,
        }),
      ]);
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained where constraints if returnRecords=true - Promise.all', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.destroy({}, { returnRecords: true }).where({
          store: store.id,
        }),
      ]);
      expect(result).toBeDefined();
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "store_id"=$1 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    describe('toJSON()', () => {
      it('should return plain objects without prototype chain when returnRecords is true', async () => {
        const products = [generator.product({ store: store.id }), generator.product({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.destroy({}, { returnRecords: true }).toJSON();

        expect(result).toHaveLength(2);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result[1]!)).toBe(Object.prototype);
      });

      it('should work with where clause', async () => {
        const products = [generator.product({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.destroy({ store: store.id }, { returnRecords: true }).toJSON();

        expect(result).toHaveLength(1);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should work with chained where', async () => {
        const products = [generator.product({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.destroy({}, { returnRecords: true }).where({ store: store.id }).toJSON();

        expect(result).toHaveLength(1);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should work with returnSelect option', async () => {
        const products = [{ id: 1, name: 'deleted' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.destroy({}, { returnSelect: ['name'] }).toJSON();

        expect(result).toHaveLength(1);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });
    });
  });
});
