import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BigAlRepository, PoolLike, PoolQueryResult, QueryResultRow, TableDefinition } from '../src/index.js';
import { belongsTo, boolean as booleanColumn, createBigAl, hasMany, integer, serial, text, textArray, defineTable as table, createdAt, updatedAt } from '../src/index.js';

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
  id: serial('id').primaryKey(),
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
  name: text('name'),
  products: hasMany(() => tables.Product!).via('store'),
};
const StoreDef = table('stores', storeSchema);
tables.Store = StoreDef;

const categorySchema = {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  products: hasMany(() => tables.Product!)
    .through(() => tables.ProductCategory!)
    .via('category'),
};
const CategoryDef = table('categories', categorySchema);
tables.Category = CategoryDef;

const productSchema = {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  sku: text('sku'),
  location: text('location'),
  aliases: textArray('alias_names').default([]),
  store: belongsTo(() => tables.Store!, 'store_id'),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};
const ProductDef = table('products', productSchema);
tables.Product = ProductDef;

const productCategorySchema = {
  ...modelBase,
  product: belongsTo(() => tables.Product!, 'product_id'),
  category: belongsTo(() => tables.Category!, 'category_id'),
  ordering: integer('ordering'),
  isPrimary: booleanColumn('is_primary'),
};
const ProductCategoryDef = table('product__category', productCategorySchema);
tables.ProductCategory = ProductCategoryDef;

const stringCollectionSchema = {
  ...modelBase,
  name: text('name').notNull(),
  otherIds: textArray('other_ids').default([]),
};
const SimpleWithStringCollectionDef = table('simple', stringCollectionSchema);

// Model with hooks
const hookedProductSchema = {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  sku: text('sku'),
  location: text('location'),
  aliases: textArray('alias_names').default([]),
  store: belongsTo(() => tables.Store!, 'store_id'),
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
  name: text('name').notNull(),
  sku: text('sku'),
  location: text('location'),
  aliases: textArray('alias_names').default([]),
  store: belongsTo(() => tables.Store!, 'store_id'),
};
const ReadonlyProductDef = table('readonly_products', readonlyProductSchema, { readonly: true });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createBigAl', () => {
  describe('initialization', () => {
    it('should throw if no models provided', () => {
      const pool = createMockPool();
      expect(() => createBigAl({ pool, models: [] })).toThrow('At least one model must be provided');
    });

    it('should throw if belongsTo references an unregistered model', () => {
      const pool = createMockPool();
      // Only register Product, not Store - the belongsTo on Product references Store
      expect(() => createBigAl({ pool, models: [ProductDef] })).toThrow(/not registered/);
    });

    it('should throw if hasMany references an unregistered model', () => {
      const pool = createMockPool();
      // Register Store but not Product - Store has hasMany to Product
      expect(() => createBigAl({ pool, models: [StoreDef] })).toThrow(/not registered/);
    });

    it('should throw if hasMany.through references an unregistered junction table', () => {
      const pool = createMockPool();
      // Register Product and Store but not ProductCategory
      expect(() => createBigAl({ pool, models: [ProductDef, StoreDef, CategoryDef] })).toThrow(/not registered/);
    });

    it('should successfully create when all relationships resolve', () => {
      const pool = createMockPool();
      const bigal = createBigAl({
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
      const standaloneDef = table('standalone', { ...modelBase, name: text('name').notNull() });
      const bigal = createBigAl({ pool, models: [standaloneDef] });
      expect(() => bigal.getRepository(ProductDef)).toThrow(/not found/);
    });

    it('should handle custom connections', () => {
      const mainPool = createMockPool();
      const analyticsPool = createMockPool();

      const analyticsSchema = {
        ...modelBase,
        name: text('name').notNull(),
      };
      const AnalyticsDef = table('analytics_events', analyticsSchema, { connection: 'analytics' });

      const bigal = createBigAl({
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
        name: text('name').notNull(),
      };
      const def = table('foo_table', schema, { connection: 'nonexistent' });

      expect(() => createBigAl({ pool, models: [def] })).toThrow(/Unable to find connection/);
    });
  });

  describe('Repository operations', () => {
    const mockedPool = createMockPool();

    let ProductRepo: BigAlRepository<typeof ProductDef.$inferSelect>;

    beforeAll(() => {
      const bigal = createBigAl({
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

    let HookedProductRepo: BigAlRepository<typeof ProductWithHooksDef.$inferSelect>;

    beforeAll(() => {
      // Use a separate createBigAl instance for hooked models
      const bigal = createBigAl({
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
      const bigal = createBigAl({
        pool: mockedPool,
        models: [ReadonlyProductDef, ProductDef, StoreDef, CategoryDef, ProductCategoryDef],
      });

      const repo = bigal.getReadonlyRepository(ReadonlyProductDef);
      expect(repo).toBeDefined();
      expect(repo.model.readonly).toBe(true);
    });
  });

  describe('Populate', () => {
    const mockedPool = createMockPool();

    let ProductRepo: BigAlRepository<typeof ProductDef.$inferSelect>;

    beforeAll(() => {
      const bigal = createBigAl({
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
});
