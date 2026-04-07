import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InferSelect, IRepository, PoolLike, PoolQueryResult, QueryResultRow } from '../src/index.js';
import { belongsTo, boolean as booleanColumn, initialize, hasMany, integer, serial, text, textArray, table } from '../src/index.js';

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

// ---------------------------------------------------------------------------
// Table definitions matching the OLD decorator models (no timestamps on Product/Store)
// ---------------------------------------------------------------------------

const modelBase = {
  id: serial().primaryKey(),
};

const storeSchema = {
  ...modelBase,
  name: text(),
  products: hasMany('Product').via('store'),
};
const StoreModel = table('stores', storeSchema);

const categorySchema = {
  ...modelBase,
  name: text().notNull(),
  products: hasMany('Product').through('ProductCategory').via('category'),
};
const CategoryModel = table('categories', categorySchema);

const productSchema = {
  ...modelBase,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo('Store'),
  categories: hasMany('Category').through('ProductCategory').via('product'),
};
const ProductModel = table('products', productSchema);

const productCategorySchema = {
  ...modelBase,
  product: belongsTo('Product'),
  category: belongsTo('Category'),
  ordering: integer(),
  isPrimary: booleanColumn(),
};
const ProductCategoryModel = table('product__category', productCategorySchema);

const hookedProductSchema = {
  ...productSchema,
};
const ProductWithHooksModel = table('products', hookedProductSchema, {
  hooks: {
    async beforeCreate(values) {
      await Promise.resolve();
      return {
        ...values,
        name: `beforeCreate - ${values.name}`,
      };
    },
    beforeUpdate(values) {
      return {
        ...values,
        name: `beforeUpdate - ${values.name}`,
      };
    },
  },
});

const stringCollectionSchema = {
  ...modelBase,
  name: text().notNull(),
  otherIds: textArray().default([]),
};
const SimpleWithStringCollectionModel = table('simple', stringCollectionSchema);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductSelect = InferSelect<(typeof ProductModel)['schema']>;
type ProductCategorySelect = InferSelect<(typeof ProductCategoryModel)['schema']>;
type StoreSelect = InferSelect<(typeof StoreModel)['schema']>;

// ---------------------------------------------------------------------------
// Generators (plain objects)
// ---------------------------------------------------------------------------

function generateStore(args?: Partial<StoreSelect>): StoreSelect {
  return {
    id: faker.number.int(),
    name: `Store - ${faker.string.uuid()}`,
    ...args,
  };
}

function generateProduct(args: Partial<ProductSelect> & Pick<ProductSelect, 'store'>): ProductSelect {
  return {
    id: faker.number.int(),
    name: `Product - ${faker.string.uuid()}`,
    sku: null,
    location: null,
    aliases: null,
    ...args,
  };
}

function generateCategory(args?: Partial<InferSelect<(typeof CategoryModel)['schema']>>): InferSelect<(typeof CategoryModel)['schema']> {
  return {
    id: faker.number.int(),
    name: `Category - ${faker.string.uuid()}`,
    ...args,
  };
}

function generateProductCategory(productInput: Pick<ProductSelect, 'id'> | number, categoryInput: Pick<InferSelect<(typeof CategoryModel)['schema']>, 'id'> | number): ProductCategorySelect {
  return {
    id: faker.number.int(),
    product: typeof productInput === 'number' ? productInput : productInput.id,
    category: typeof categoryInput === 'number' ? categoryInput : categoryInput.id,
    ordering: null,
    isPrimary: null,
  };
}

function generateSimpleWithStringCollection(args?: Partial<InferSelect<(typeof SimpleWithStringCollectionModel)['schema']>>): InferSelect<(typeof SimpleWithStringCollectionModel)['schema']> {
  return {
    id: faker.number.int(),
    name: `WithStringCollection - ${faker.string.uuid()}`,
    otherIds: [faker.string.uuid(), faker.string.uuid()],
    ...args,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Repository', () => {
  const mockedPool = createMockPool();

  let ProductRepository: IRepository<ProductSelect>;
  let ProductCategoryRepository: IRepository<ProductCategorySelect>;
  let SimpleWithStringCollectionRepository: IRepository<InferSelect<(typeof SimpleWithStringCollectionModel)['schema']>>;
  let StoreRepository: IRepository<StoreSelect>;
  let ProductWithHooksRepository: IRepository<InferSelect<(typeof ProductWithHooksModel)['schema']>>;

  beforeAll(() => {
    const bigal = initialize({
      models: [CategoryModel, ProductModel, ProductCategoryModel, SimpleWithStringCollectionModel, StoreModel],
      pool: mockedPool,
    });

    ProductRepository = bigal.getRepository(ProductModel);
    ProductCategoryRepository = bigal.getRepository(ProductCategoryModel);
    SimpleWithStringCollectionRepository = bigal.getRepository(SimpleWithStringCollectionModel);
    StoreRepository = bigal.getRepository(StoreModel);

    // Separate instance for hooked models since they share the 'products' table name
    const hookedBigal = initialize({
      models: [ProductWithHooksModel, StoreModel, CategoryModel, ProductCategoryModel],
      pool: mockedPool,
    });
    ProductWithHooksRepository = hookedBigal.getRepository(ProductWithHooksModel);
  });

  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  describe('#create()', () => {
    let store: StoreSelect;

    beforeEach(() => {
      store = generateStore();
    });

    it('should execute beforeCreate if defined as a schema method', async () => {
      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            id: 42,
          },
        ]),
      );

      await ProductWithHooksRepository.create({
        name: 'foo',
        store: 1,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      const [, params] = mockedPool.query.mock.calls[0]!;

      assert(params);
      expect(params).toStrictEqual(['beforeCreate - foo', [], 1]);
    });

    it('should return single object result if single value is specified', async () => {
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      expect(result).toStrictEqual(returnValue);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO NOTHING RETURNING "id","name"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], product.store]);
    });

    it('should support merge on conflict', async () => {
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      expect(result).toStrictEqual(returnValue);

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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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

    it('should allow populated value parameters by passing the id directly', async () => {
      const product = generateProduct({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: store.id,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, [], store.id]);
    });

    it('should allow partial object (omitting some required fields) as a value parameter', async () => {
      const category = generateCategory();
      const product: Pick<ProductSelect, 'id' | 'name'> = generateProduct({
        store: store.id,
      });
      const productCategory = generateProductCategory(product, category);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([productCategory]));

      const result = await ProductCategoryRepository.create({
        product: product.id,
        category: category.id,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result).toStrictEqual(productCategory);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'INSERT INTO "product__category" ("product_id","category_id") VALUES ($1,$2) RETURNING "id","product_id" AS "product","category_id" AS "category","ordering","is_primary" AS "isPrimary"',
      );
      assert(params);
      expect(params).toStrictEqual([product.id, category.id]);
    });

    it('should insert with string array value parameter', async () => {
      const item = generateSimpleWithStringCollection();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([item]));

      const createParams: Record<string, unknown> = {
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
      const product = generateProduct({
        store: store.id,
      });

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
      const category = generateCategory();
      const product = generateProduct({
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
  });

  describe('#update()', () => {
    let store: StoreSelect;

    beforeEach(() => {
      store = generateStore();
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

      await ProductWithHooksRepository.update(
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
      const product = generateProduct({
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
      const product = generateProduct({
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
      const product = generateProduct({
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

    it('should allow update with foreign key id values', async () => {
      const product = generateProduct({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const results = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: store.id,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(results).toStrictEqual([product]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      expect(params).toStrictEqual([product.name, store.id, product.id]);
    });

    it('should allow partial object (omitting some required fields) as a value parameter', async () => {
      const category = generateCategory();
      const product: Pick<ProductSelect, 'id' | 'name'> = generateProduct({
        store: store.id,
      });
      const productCategory = generateProductCategory(product, category);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([productCategory]));

      const results = await ProductCategoryRepository.update(
        {
          id: productCategory.id,
        },
        {
          product: product.id,
          category: category.id,
        },
      );

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(results).toStrictEqual([productCategory]);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'UPDATE "product__category" SET "product_id"=$1,"category_id"=$2 WHERE "id"=$3 RETURNING "id","product_id" AS "product","category_id" AS "category","ordering","is_primary" AS "isPrimary"',
      );
      assert(params);
      expect(params).toStrictEqual([product.id, category.id, productCategory.id]);
    });
  });

  describe('#destroy()', () => {
    let store: StoreSelect;

    beforeEach(() => {
      store = generateStore();
    });

    it('should delete all records and return void if there are no constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
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
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy({
        id: products.map((item) => item.id),
        store: store.id,
      });
      expect(result).toBeUndefined();

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('DELETE FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call constraints as a parameter if returnRecords=true', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.destroy(
        {
          id: products.map((item) => item.id),
          store: store.id,
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
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

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
        generateProduct({
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
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
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
        generateProduct({
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
  });
});
