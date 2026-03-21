import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { afterEach, beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { IRepository, OnQueryEvent, PoolLike, PoolQueryResult, QueryResultRow, TableDefinition } from '../src/index.js';
import { belongsTo, boolean as booleanColumn, initialize, hasMany, integer, serial, text, textArray, defineTable as table, createdAt, updatedAt } from '../src/index.js';

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool() {
  const pool = { query: vi.fn<PoolQueryFn>() };
  return pool as PoolLike & typeof pool;
}

function getQueryResult<T extends QueryResultRow>(rows: T[] = []): PoolQueryResult<T> & { command: string; fields: never[]; oid: number } {
  return {
    command: 'select',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

// ---------------------------------------------------------------------------
// Table definitions using the new schema API
// ---------------------------------------------------------------------------

const modelBase = {
  id: serial().primaryKey(),
};

const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tables: Record<string, TableDefinition<any, any>> = {};

const storeSchema = {
  ...modelBase,
  ...timestamps,
  name: text(),
  products: hasMany(() => tables.Product!).via('store'),
};
const StoreDef = table('stores', storeSchema);
tables.Store = StoreDef;

const categorySchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  products: hasMany(() => tables.Product!)
    .through(() => tables.ProductCategory!)
    .via('category'),
};
const CategoryDef = table('categories', categorySchema);
tables.Category = CategoryDef;

const productSchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo(() => tables.Store!),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};
const ProductDef = table('products', productSchema);
tables.Product = ProductDef;

const productCategorySchema = {
  ...modelBase,
  product: belongsTo(() => tables.Product!),
  category: belongsTo(() => tables.Category!),
  ordering: integer(),
  isPrimary: booleanColumn(),
};
const ProductCategoryDef = table('product__category', productCategorySchema);
tables.ProductCategory = ProductCategoryDef;

const stringCollectionSchema = {
  ...modelBase,
  name: text().notNull(),
  otherIds: textArray().default([]),
};
const SimpleWithStringCollectionDef = table('simple', stringCollectionSchema);

// Model with hooks
const hookedProductSchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo(() => tables.Store!),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};
const ProductWithHooksDef = table('products', hookedProductSchema, {
  hooks: {
    async beforeCreate(values) {
      return {
        ...values,
        name: `beforeCreate - ${values.name}`,
      };
    },
    beforeUpdate(values) {
      return {
        ...values,
        name: values.name ? `beforeUpdate - ${values.name}` : values.name,
      };
    },
  },
});

// Readonly model
const readonlyProductSchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  sku: text(),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  store: belongsTo(() => tables.Store!),
};
const ReadonlyProductDef = table('readonly_products', readonlyProductSchema, { readonly: true });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initialize', () => {
  describe('initialization', () => {
    it('should throw if no models provided', () => {
      const pool = createMockPool();
      expect(() => initialize({ pool, models: [] })).toThrow('At least one model must be provided');
    });

    it('should throw if belongsTo references an unregistered model', () => {
      const pool = createMockPool();
      // Only register Product, not Store - the belongsTo on Product references Store
      expect(() => initialize({ pool, models: [ProductDef] })).toThrow(/not registered/);
    });

    it('should throw if hasMany references an unregistered model', () => {
      const pool = createMockPool();
      // Register Store but not Product - Store has hasMany to Product
      expect(() => initialize({ pool, models: [StoreDef] })).toThrow(/not registered/);
    });

    it('should throw if hasMany.through references an unregistered junction table', () => {
      const pool = createMockPool();
      // Register Product and Store but not ProductCategory
      expect(() => initialize({ pool, models: [ProductDef, StoreDef, CategoryDef] })).toThrow(/not registered/);
    });

    it('should successfully create when all relationships resolve', () => {
      const pool = createMockPool();
      const bigal = initialize({
        pool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });
      expect(bigal).toBeDefined();
      expect(bigal.getRepository).toBeTypeOf('function');
      expect(bigal.getReadonlyRepository).toBeTypeOf('function');
    });

    it('should throw when getting repository for unregistered table', () => {
      const pool = createMockPool();
      // Use a standalone table with no relationships for this test
      const standaloneDef = table('standalone', { ...modelBase, name: text().notNull() });
      const bigal = initialize({ pool, models: [standaloneDef] });
      expect(() => bigal.getRepository(ProductDef)).toThrow(/not found/);
    });

    it('should handle custom connections', () => {
      const mainPool = createMockPool();
      const analyticsPool = createMockPool();

      const analyticsSchema = {
        ...modelBase,
        name: text().notNull(),
      };
      const AnalyticsDef = table('analytics_events', analyticsSchema, { connection: 'analytics' });

      const bigal = initialize({
        pool: mainPool,
        models: [AnalyticsDef],
        connections: {
          analytics: { pool: analyticsPool },
        },
      });

      expect(bigal.getRepository(AnalyticsDef)).toBeDefined();
    });

    it('should throw for unknown connection', () => {
      const pool = createMockPool();
      const schema = {
        ...modelBase,
        name: text().notNull(),
      };
      const def = table('foo_table', schema, { connection: 'nonexistent' });

      expect(() => initialize({ pool, models: [def] })).toThrow(/Unable to find connection/);
    });
  });

  describe('Repository operations', () => {
    const mockedPool = createMockPool();

    let ProductRepo: IRepository<typeof ProductDef.$inferSelect>;

    beforeAll(() => {
      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef, SimpleWithStringCollectionDef],
      });

      ProductRepo = bigal.getRepository(ProductDef);
    });

    beforeEach(() => {
      mockedPool.query.mockReset();
    });

    describe('#create()', () => {
      it('should generate correct INSERT SQL', async () => {
        const storeId = faker.number.int();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id: 42,
              name: 'Widget',
              sku: null,
              location: null,
              aliases: [],
              store: storeId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        );

        const result = await ProductRepo.create({
          name: 'Widget',
          store: storeId,
        });

        expect(mockedPool.query).toHaveBeenCalledOnce();
        expect(result).toBeDefined();
        expect(result.name).toBe('Widget');

        const [query] = mockedPool.query.mock.calls[0]!;
        // The SQL includes createdAt/updatedAt because they get auto-set default values
        expect(query).toContain('INSERT INTO "products"');
        expect(query).toContain('"name"');
        expect(query).toContain('"alias_names"');
        expect(query).toContain('"store_id"');
        expect(query).toContain('RETURNING');
      });

      it('should return void when returnRecords=false', async () => {
        const storeId = faker.number.int();
        mockedPool.query.mockResolvedValueOnce(getQueryResult());

        const result = await ProductRepo.create({ name: 'Widget', store: storeId }, { returnRecords: false });

        expect(result).toBeUndefined();
      });

      it('should support array insert', async () => {
        const storeId = faker.number.int();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            { id: 1, name: 'A', sku: null, location: null, aliases: [], store: storeId, createdAt: new Date(), updatedAt: new Date() },
            { id: 2, name: 'B', sku: null, location: null, aliases: [], store: storeId, createdAt: new Date(), updatedAt: new Date() },
          ]),
        );

        const results = await ProductRepo.create([
          { name: 'A', store: storeId },
          { name: 'B', store: storeId },
        ]);

        expect(results).toHaveLength(2);
      });
    });

    describe('#find()', () => {
      it('should generate correct SELECT SQL', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        await ProductRepo.find({});

        expect(mockedPool.query).toHaveBeenCalledOnce();
        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('SELECT');
        expect(query).toContain('"products"');
      });

      it('should support where clauses', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        await ProductRepo.find({ where: { name: 'Widget' } });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('WHERE');
        assert(params);
        expect(params).toContain('Widget');
      });

      it('should support sort', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        await ProductRepo.find({}).sort('name');

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('ORDER BY');
      });

      it('should support limit and skip', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        await ProductRepo.find({}).limit(10).skip(20);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('LIMIT');
        expect(query).toContain('OFFSET');
      });
    });

    describe('#findOne()', () => {
      it('should return null when no rows found', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        const result = await ProductRepo.findOne({ where: { id: 999 } });

        expect(result).toBeNull();
      });

      it('should return a single record', async () => {
        const storeId = faker.number.int();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id: 42,
              name: 'Widget',
              sku: null,
              location: null,
              aliases: [],
              store: storeId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        );

        const result = await ProductRepo.findOne({ where: { id: 42 } });

        expect(result).toBeDefined();
        expect(result?.name).toBe('Widget');
      });
    });

    describe('#count()', () => {
      it('should return count', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([{ count: '5' }]));

        const count = await ProductRepo.count({});

        expect(count).toBe(5);
      });

      it('should support where clause', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([{ count: '3' }]));

        const count = await ProductRepo.count({ where: { name: 'Widget' } });

        expect(count).toBe(3);
        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('WHERE');
        assert(params);
        expect(params).toContain('Widget');
      });
    });

    describe('#update()', () => {
      it('should generate correct UPDATE SQL', async () => {
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id: 42,
              name: 'Updated Widget',
              sku: null,
              location: null,
              aliases: [],
              store: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        );

        const results = await ProductRepo.update({ id: 42 }, { name: 'Updated Widget' });

        expect(mockedPool.query).toHaveBeenCalledOnce();
        expect(results).toHaveLength(1);
        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('UPDATE "products"');
        expect(query).toContain('SET');
        expect(query).toContain('WHERE');
      });

      it('should return void when returnRecords=false', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult());

        const result = await ProductRepo.update({ id: 42 }, { name: 'Updated' }, { returnRecords: false });

        expect(result).toBeUndefined();
      });
    });

    describe('#destroy()', () => {
      it('should generate correct DELETE SQL', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult());

        await ProductRepo.destroy({ id: 42 });

        expect(mockedPool.query).toHaveBeenCalledOnce();
        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toContain('DELETE FROM "products"');
        expect(query).toContain('WHERE');
      });

      it('should return records when returnRecords=true', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 42, name: 'Deleted', sku: null, location: null, aliases: [], store: 1, createdAt: new Date(), updatedAt: new Date() }]));

        const results = await ProductRepo.destroy({ id: 42 }, { returnRecords: true });

        expect(results).toHaveLength(1);
      });
    });

    describe('model metadata', () => {
      it('should expose model metadata', () => {
        expect(ProductRepo.model).toBeDefined();
        expect(ProductRepo.model.tableName).toBe('products');
        expect(ProductRepo.model.primaryKeyColumn).toBeDefined();
      });

      it('should have correct column mappings', () => {
        expect(ProductRepo.model.columnsByPropertyName).toHaveProperty('name');
        expect(ProductRepo.model.columnsByPropertyName).toHaveProperty('store');
        expect(ProductRepo.model.columnsByColumnName).toHaveProperty('store_id');
      });
    });
  });

  describe('Hooks via table definition', () => {
    const mockedPool = createMockPool();

    let HookedProductRepo: IRepository<typeof ProductWithHooksDef.$inferSelect>;

    beforeAll(() => {
      // Use a separate initialize instance for hooked models
      const bigal = initialize({
        pool: mockedPool,
        models: [ProductWithHooksDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      HookedProductRepo = bigal.getRepository(ProductWithHooksDef);
    });

    beforeEach(() => {
      mockedPool.query.mockReset();
    });

    it('should execute beforeCreate hook', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 42 }]));

      await HookedProductRepo.create({
        name: 'foo',
        store: 1,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      const [, params] = mockedPool.query.mock.calls[0]!;
      assert(params);
      // The beforeCreate hook prepends "beforeCreate - " to the name
      // Params include auto-set date columns, so find the name param
      expect(params).toContain('beforeCreate - foo');
    });

    it('should execute beforeUpdate hook', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 42, name: 'beforeUpdate - bar' }]));

      await HookedProductRepo.update({ id: 42 }, { name: 'bar' });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      const [, params] = mockedPool.query.mock.calls[0]!;
      assert(params);
      // The beforeUpdate hook prepends "beforeUpdate - " to the name
      expect(params).toContain('beforeUpdate - bar');
    });
  });

  describe('Readonly repository', () => {
    const mockedPool = createMockPool();

    it('should return a readonly repository', () => {
      const bigal = initialize({
        pool: mockedPool,
        models: [ReadonlyProductDef, ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      const repo = bigal.getReadonlyRepository(ReadonlyProductDef);
      expect(repo).toBeDefined();
      expect(repo.model.readonly).toBe(true);
    });
  });

  describe('afterFind hook', () => {
    const mockedPool = createMockPool();

    it('should transform find results via afterFind hook', async () => {
      const ProductWithAfterFind = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
          sku: text(),
        },
        {
          modelName: 'ProductWithAfterFind',
          hooks: {
            afterFind(results) {
              return results.map((row) => ({
                ...row,
                displayName: `${row.name} (${row.sku ?? 'no sku'})`,
              }));
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAfterFind] });
      const repo = bigal.getRepository(ProductWithAfterFind);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget', sku: 'WDG-001' }]));
      const results = await repo.find({});
      expect(results).toHaveLength(1);
      // @ts-expect-error -- afterFind added displayName which isn't on the inferred type
      expect(results[0]!.displayName).toBe('Widget (WDG-001)');
    });

    it('should transform findOne results via afterFind hook', async () => {
      const ProductWithAfterFind = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAfterFindOne',
          hooks: {
            afterFind(results) {
              return results.map((row) => ({ ...row, transformed: true }));
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAfterFind] });
      const repo = bigal.getRepository(ProductWithAfterFind);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget' }]));
      const result = await repo.findOne({});
      assert(result);
      // @ts-expect-error -- afterFind added transformed which isn't on the inferred type
      expect(result.transformed).toBe(true);
    });

    it('should support async afterFind hooks', async () => {
      const ProductWithAsyncHook = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAsyncAfterFind',
          hooks: {
            async afterFind(results) {
              await Promise.resolve();
              return results.map((row) => ({ ...row, async: true }));
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAsyncHook] });
      const repo = bigal.getRepository(ProductWithAsyncHook);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget' }]));
      const results = await repo.find({});
      // @ts-expect-error -- afterFind added async which isn't on the inferred type
      expect(results[0]!.async).toBe(true);
    });
  });

  describe('afterCreate hook', () => {
    const mockedPool = createMockPool();

    it('should fire afterCreate with the created entity', async () => {
      const created: unknown[] = [];
      const ProductWithAfterCreate = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAfterCreate',
          hooks: {
            afterCreate(result) {
              created.push(result);
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAfterCreate] });
      const repo = bigal.getRepository(ProductWithAfterCreate);
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget' }]));
      await repo.create({ name: 'Widget' });
      expect(created).toHaveLength(1);
      expect(created[0]).toStrictEqual({ id: 1, name: 'Widget' });
    });

    it('should swallow afterCreate errors', async () => {
      const ProductWithBrokenHook = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithBrokenAfterCreate',
          hooks: {
            afterCreate() {
              throw new Error('hook failed');
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithBrokenHook] });
      const repo = bigal.getRepository(ProductWithBrokenHook);
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget' }]));
      // Should not throw despite the hook error
      const result = await repo.create({ name: 'Widget' });
      expect(result).toStrictEqual({ id: 1, name: 'Widget' });
    });
  });

  describe('afterUpdate hook', () => {
    const mockedPool = createMockPool();

    it('should fire afterUpdate with the updated entity', async () => {
      const updated: unknown[] = [];
      const ProductWithAfterUpdate = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAfterUpdate',
          hooks: {
            afterUpdate(result) {
              updated.push(result);
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAfterUpdate] });
      const repo = bigal.getRepository(ProductWithAfterUpdate);
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Updated' }]));
      await repo.update({ id: 1 }, { name: 'Updated' });
      expect(updated).toHaveLength(1);
      expect(updated[0]).toStrictEqual({ id: 1, name: 'Updated' });
    });
  });

  describe('beforeDestroy hook', () => {
    const mockedPool = createMockPool();

    beforeEach(() => {
      mockedPool.query.mockReset();
    });

    it('should fire beforeDestroy which can modify the where clause', async () => {
      const ProductWithBeforeDestroy = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithBeforeDestroy',
          hooks: {
            beforeDestroy(where) {
              return { ...where, name: 'only-delete-this' };
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithBeforeDestroy] });
      const repo = bigal.getRepository(ProductWithBeforeDestroy);
      mockedPool.query.mockResolvedValueOnce(getQueryResult());
      await repo.destroy({ id: 1 });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"name"=');
    });

    it('should abort destroy when beforeDestroy throws', async () => {
      const ProductWithAbortDestroy = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAbortDestroy',
          hooks: {
            beforeDestroy() {
              throw new Error('abort!');
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAbortDestroy] });
      const repo = bigal.getRepository(ProductWithAbortDestroy);
      await expect(repo.destroy({ id: 1 })).rejects.toThrow('abort!');
      expect(mockedPool.query).not.toHaveBeenCalled();
    });
  });

  describe('afterDestroy hook', () => {
    const mockedPool = createMockPool();

    it('should fire afterDestroy with rowCount', async () => {
      let destroyResult: { rowCount: number } | undefined;
      const ProductWithAfterDestroy = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        {
          modelName: 'ProductWithAfterDestroy',
          hooks: {
            afterDestroy(result) {
              destroyResult = result;
            },
          },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [ProductWithAfterDestroy] });
      const repo = bigal.getRepository(ProductWithAfterDestroy);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 3 });
      await repo.destroy({ id: 1 });
      expect(destroyResult).toStrictEqual({ rowCount: 3 });
    });
  });

  describe('Global filters', () => {
    const mockedPool = createMockPool();

    const SoftDeleteProduct = table(
      'products',
      {
        id: serial().primaryKey(),
        name: text().notNull(),
        isDeleted: booleanColumn().notNull().default(false),
        tenantId: text().notNull(),
      },
      {
        modelName: 'SoftDeleteProduct',
        filters: {
          notDeleted: { isDeleted: false },
          tenant: () => ({ tenantId: 'tenant-123' }),
        },
      },
    );

    let repo: IRepository<typeof SoftDeleteProduct.$inferSelect>;

    beforeAll(() => {
      const bigal = initialize({ pool: mockedPool, models: [SoftDeleteProduct] });
      repo = bigal.getRepository(SoftDeleteProduct);
    });

    beforeEach(() => {
      mockedPool.query.mockReset();
    });

    it('should automatically apply all filters to find()', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find().where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"is_deleted"=');
      expect(query).toContain('"tenant_id"=');
      expect(query).toContain('"name"=');
    });

    it('should automatically apply all filters to findOne()', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.findOne().where({ id: 1 });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"is_deleted"=');
      expect(query).toContain('"tenant_id"=');
    });

    it('should disable all filters with filters: false in args', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find({ filters: false }).where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).not.toContain('"is_deleted"=');
      expect(query).not.toContain('"tenant_id"=');
      expect(query).toContain('"name"=');
    });

    it('should disable specific filter with filters: { filterName: false }', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find({ filters: { notDeleted: false } }).where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).not.toContain('"is_deleted"=');
      expect(query).toContain('"tenant_id"=');
      expect(query).toContain('"name"=');
    });

    it('should disable all filters with .filters(false) chain', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find().filters(false).where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).not.toContain('"is_deleted"=');
      expect(query).not.toContain('"tenant_id"=');
    });

    it('should disable specific filter with .filters({ name: false }) chain', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find().filters({ tenant: false }).where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"is_deleted"=');
      expect(query).not.toContain('"tenant_id"=');
    });

    it('should allow where clause to override a filter value', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find().where({ isDeleted: [true, false] });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      // The where value [true, false] should override the filter value false
      expect(query).toContain('"is_deleted"=ANY');
      expect(params).toStrictEqual([[true, false], 'tenant-123']);
    });

    it('should evaluate dynamic filters at query time', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await repo.find().where({ name: 'Widget' });

      const [, params] = mockedPool.query.mock.calls[0]!;
      // tenant filter returns { tenantId: 'tenant-123' }
      expect(params).toContain('tenant-123');
    });

    it('should apply filters in toSQL()', () => {
      const { sql, params } = repo.find().where({ name: 'Widget' }).toSQL();

      expect(sql).toContain('"is_deleted"=');
      expect(sql).toContain('"tenant_id"=');
      expect(params).toContain('tenant-123');
    });

    it('should not apply filters when model has no filters defined', async () => {
      const NoFilterProduct = table(
        'products',
        {
          id: serial().primaryKey(),
          name: text().notNull(),
        },
        { modelName: 'NoFilterProduct' },
      );

      const bigal = initialize({ pool: mockedPool, models: [NoFilterProduct] });
      const noFilterRepo = bigal.getRepository(NoFilterProduct);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      await noFilterRepo.find().where({ name: 'Widget' });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).not.toContain('"is_deleted"=');
      expect(query).not.toContain('"tenant_id"=');
    });
  });

  describe('toSQL()', () => {
    const mockedPool = createMockPool();

    it('should return SQL and params from find() without executing', () => {
      const bigal = initialize({ pool: mockedPool, models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef] });
      const repo = bigal.getRepository(ProductDef);

      const { sql, params } = repo.find().where({ name: 'Widget' }).sort('name asc').limit(10).toSQL();

      expect(sql).toContain('SELECT');
      expect(sql).toContain('"name"=$1');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT');
      expect(params).toStrictEqual(['Widget']);
      // Should NOT have called pool.query
      expect(mockedPool.query).not.toHaveBeenCalled();
    });

    it('should return SQL and params from findOne() without executing', () => {
      const bigal = initialize({ pool: mockedPool, models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef] });
      const repo = bigal.getRepository(ProductDef);

      const { sql, params } = repo.findOne().where({ id: 42 }).toSQL();

      expect(sql).toContain('SELECT');
      expect(sql).toContain('"id"=$1');
      expect(sql).toContain('LIMIT 1');
      expect(params).toStrictEqual([42]);
      expect(mockedPool.query).not.toHaveBeenCalled();
    });

    it('should return SQL with select columns', () => {
      const bigal = initialize({ pool: mockedPool, models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef] });
      const repo = bigal.getRepository(ProductDef);

      const { sql } = repo.find().select(['name', 'sku']).toSQL();

      expect(sql).toContain('"name"');
      expect(sql).toContain('"sku"');
      expect(sql).not.toContain('"location"');
    });
  });

  describe('Populate', () => {
    const mockedPool = createMockPool();

    let ProductRepo: IRepository<typeof ProductDef.$inferSelect>;

    beforeAll(() => {
      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      ProductRepo = bigal.getRepository(ProductDef);
    });

    beforeEach(() => {
      mockedPool.query.mockReset();
    });

    it('should populate single associations', async () => {
      const storeId = faker.number.int();

      // First query: find the product
      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            id: 42,
            name: 'Widget',
            sku: null,
            location: null,
            aliases: [],
            store: storeId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      );

      // Second query: populate the store
      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            id: storeId,
            name: 'My Store',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      );

      // Populate works at runtime through column metadata, but the current type system
      // requires T extends Entity properties for populate(). The full type migration in Phase 1
      // will fix this. For now, test the runtime behavior.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ProductRepo as any).findOne({}).where({ id: 42 }).populate('store');

      expect(result).toBeDefined();
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('onQuery observability', () => {
    const mockedPool = createMockPool();
    const events: OnQueryEvent[] = [];

    let ProductRepo: IRepository<typeof ProductDef.$inferSelect>;

    beforeAll(() => {
      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
        onQuery(event) {
          events.push(event);
        },
      });

      ProductRepo = bigal.getRepository(ProductDef);
    });

    beforeEach(() => {
      mockedPool.query.mockReset();
      events.length = 0;
    });

    it('should fire onQuery for find', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepo.find({});

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('find');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('SELECT');
      expect(event.params).toBeDefined();
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should fire onQuery for findOne', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepo.findOne({ where: { id: 1 } });

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('findOne');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('SELECT');
      expect(event.params).toContain(1);
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should fire onQuery for count', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ count: '7' }]));

      await ProductRepo.count({ where: { name: 'Widget' } });

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('count');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('count');
      expect(event.params).toContain('Widget');
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should fire onQuery for create', async () => {
      const storeId = faker.number.int();
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, name: 'Widget', sku: null, location: null, aliases: [], store: storeId, createdAt: new Date(), updatedAt: new Date() }]));

      await ProductRepo.create({ name: 'Widget', store: storeId });

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('create');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('INSERT');
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should fire onQuery for update', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 42, name: 'Updated', sku: null, location: null, aliases: [], store: 1, createdAt: new Date(), updatedAt: new Date() }]));

      await ProductRepo.update({ id: 42 }, { name: 'Updated' });

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('update');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('UPDATE');
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should fire onQuery for destroy', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepo.destroy({ id: 42 });

      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.operation).toBe('destroy');
      expect(event.model).toBe('products');
      expect(event.sql).toContain('DELETE');
      expect(event.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include correct sql, params, duration, model, and operation', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await ProductRepo.find({ where: { name: 'test' } });

      const event = events[0]!;
      expect(event).toHaveProperty('sql');
      expect(event).toHaveProperty('params');
      expect(event).toHaveProperty('duration');
      expect(event).toHaveProperty('model');
      expect(event).toHaveProperty('operation');
      expectTypeOf(event.sql).toBeString();
      expect(Array.isArray(event.params)).toBe(true);
      expectTypeOf(event.duration).toBeNumber();
      expectTypeOf(event.model).toBeString();
      expectTypeOf(event.operation).toBeString();
    });

    it('should swallow errors from onQuery callback', async () => {
      const throwingPool = createMockPool();
      throwingPool.query.mockResolvedValueOnce(getQueryResult([]));

      const bigal = initialize({
        pool: throwingPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
        onQuery() {
          throw new Error('Callback exploded');
        },
      });

      const repo = bigal.getRepository(ProductDef);
      const results = await repo.find({});

      expect(results).toStrictEqual([]);
    });

    it('should not fire onQuery when callback is not provided', async () => {
      const plainPool = createMockPool();
      plainPool.query.mockResolvedValueOnce(getQueryResult([]));

      const bigal = initialize({
        pool: plainPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      const repo = bigal.getRepository(ProductDef);

      // Spy on performance.now to verify it is NOT called when onQuery is absent
      const performanceSpy = vi.spyOn(performance, 'now');

      await repo.find({});

      expect(performanceSpy).not.toHaveBeenCalled();
      performanceSpy.mockRestore();
    });
  });

  describe('DEBUG_BIGAL fallback', () => {
    const originalEnv = process.env.DEBUG_BIGAL;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.DEBUG_BIGAL;
      } else {
        process.env.DEBUG_BIGAL = originalEnv;
      }
    });

    it('should use console.log as default onQuery when DEBUG_BIGAL=true', async () => {
      process.env.DEBUG_BIGAL = 'true';

      const mockedPool = createMockPool();
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      const repo = bigal.getRepository(ProductDef);
      await repo.find({});

      expect(consoleSpy).toHaveBeenCalledOnce();
      const logMessage = consoleSpy.mock.calls[0]![0] as string;
      expect(logMessage).toContain('BigAl');
      expect(logMessage).toContain('find');
      expect(logMessage).toContain('products');

      consoleSpy.mockRestore();
    });

    it('should not use console.log when DEBUG_BIGAL is not set', async () => {
      delete process.env.DEBUG_BIGAL;

      const mockedPool = createMockPool();
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      const repo = bigal.getRepository(ProductDef);
      await repo.find({});

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should prefer explicit onQuery over DEBUG_BIGAL', async () => {
      process.env.DEBUG_BIGAL = 'true';

      const mockedPool = createMockPool();
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const customEvents: OnQueryEvent[] = [];

      const bigal = initialize({
        pool: mockedPool,
        models: [ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
        onQuery(event) {
          customEvents.push(event);
        },
      });

      const repo = bigal.getRepository(ProductDef);
      await repo.find({});

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(customEvents).toHaveLength(1);

      consoleSpy.mockRestore();
    });
  });
});
