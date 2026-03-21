import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IReadonlyRepository, IRepository, PoolLike, PoolQueryResult, QueryResultRow } from '../src/index.js';
import { initialize, subquery } from '../src/index.js';
import type { SelectAggregateExpression, Sort, TypedAggregateExpression, WhereQuery } from '../src/query/index.js';

import { pick } from './utils/pick.js';
import {
  CategoryDef,
  ClassroomDef,
  generateCategory,
  generateClassroom,
  generateLevelOne,
  generateLevelThree,
  generateLevelTwo,
  generateParkingLot,
  generateParkingSpace,
  generateProduct,
  generateProductCategory,
  generateSimpleWithJson,
  generateSimpleWithOptionalEnum,
  generateSimpleWithRelationAndJson,
  generateSimpleWithSelfReference,
  generateSimpleWithStringCollection,
  generateSimpleWithStringId,
  generateSimpleWithUnion,
  generateStore,
  generateTeacher,
  generateTeacherClassroom,
  KitchenSinkDef,
  LevelOneDef,
  LevelThreeDef,
  LevelTwoDef,
  ParkingLotDef,
  ParkingSpaceDef,
  ProductCategoryDef,
  ProductDef,
  ReadonlyProductDef,
  SimpleWithJsonDef,
  SimpleWithOptionalEnumDef,
  SimpleWithRelationAndJsonDef,
  SimpleWithSelfReferenceDef,
  SimpleWithStringCollectionDef,
  SimpleWithUnionDef,
  StoreDef,
  StudentClassroomDef,
  StudentDef,
  TeacherClassroomDef,
  TeacherDef,
} from './utils/testModels.js';
import type {
  CategorySelect,
  ClassroomSelect,
  KitchenSinkSelect,
  LevelOneSelect,
  LevelThreeSelect,
  LevelTwoSelect,
  ParkingLotSelect,
  ParkingSpaceSelect,
  ProductCategorySelect,
  ProductSelect,
  ReadonlyProductSelect,
  SimpleWithJsonSelect,
  SimpleWithOptionalEnumSelect,
  SimpleWithRelationAndJsonSelect,
  SimpleWithSelfReferenceSelect,
  SimpleWithStringCollectionSelect,
  SimpleWithUnionSelect,
  StoreSelect,
  TeacherClassroomSelect,
  TeacherSelect,
} from './utils/testModels.js';

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool() {
  const pool = { query: vi.fn<PoolQueryFn>() };
  return pool as PoolLike & typeof pool;
}

function getQueryResult<T extends QueryResultRow>(rows: T[]): PoolQueryResult<T> & { command: string; oid: number; fields: never[] } {
  return {
    command: 'select',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

describe('ReadonlyRepository', () => {
  const mockedPool = createMockPool();

  let LevelOneRepository: IRepository<LevelOneSelect>;
  let LevelTwoRepository: IRepository<LevelTwoSelect>;
  let LevelThreeRepository: IRepository<LevelThreeSelect>;
  let ProductRepository: IRepository<ProductSelect>;
  let ReadonlyProductRepository: IReadonlyRepository<ReadonlyProductSelect>;
  let ReadonlyKitchenSinkRepository: IReadonlyRepository<KitchenSinkSelect>;
  let StoreRepository: IRepository<StoreSelect>;
  let SimpleWithJsonRepository: IRepository<SimpleWithJsonSelect>;
  let SimpleWithOptionalEnumRepository: IRepository<SimpleWithOptionalEnumSelect>;
  let SimpleWithRelationAndJsonRepository: IRepository<SimpleWithRelationAndJsonSelect>;
  let SimpleWithSelfReferenceRepository: IRepository<SimpleWithSelfReferenceSelect>;
  let SimpleWithStringCollectionRepository: IRepository<SimpleWithStringCollectionSelect>;
  let SimpleWithUnionRepository: IRepository<SimpleWithUnionSelect>;
  let TeacherRepository: IRepository<TeacherSelect>;

  beforeAll(() => {
    const bigal = initialize({
      models: [
        ClassroomDef,
        CategoryDef,
        KitchenSinkDef,
        LevelOneDef,
        LevelTwoDef,
        LevelThreeDef,
        ParkingLotDef,
        ParkingSpaceDef,
        ProductDef,
        ProductCategoryDef,
        ReadonlyProductDef,
        SimpleWithJsonDef,
        SimpleWithOptionalEnumDef,
        SimpleWithRelationAndJsonDef,
        SimpleWithSelfReferenceDef,
        SimpleWithStringCollectionDef,
        SimpleWithUnionDef,
        StoreDef,
        StudentDef,
        StudentClassroomDef,
        TeacherDef,
        TeacherClassroomDef,
      ],
      pool: mockedPool,
    });

    LevelOneRepository = bigal.getRepository(LevelOneDef);
    LevelTwoRepository = bigal.getRepository(LevelTwoDef);
    LevelThreeRepository = bigal.getRepository(LevelThreeDef);
    ProductRepository = bigal.getRepository(ProductDef);
    ReadonlyProductRepository = bigal.getReadonlyRepository(ReadonlyProductDef);
    ReadonlyKitchenSinkRepository = bigal.getReadonlyRepository(KitchenSinkDef);
    StoreRepository = bigal.getRepository(StoreDef);
    SimpleWithJsonRepository = bigal.getRepository(SimpleWithJsonDef);
    SimpleWithOptionalEnumRepository = bigal.getRepository(SimpleWithOptionalEnumDef);
    SimpleWithRelationAndJsonRepository = bigal.getRepository(SimpleWithRelationAndJsonDef);
    SimpleWithSelfReferenceRepository = bigal.getRepository(SimpleWithSelfReferenceDef);
    SimpleWithStringCollectionRepository = bigal.getRepository(SimpleWithStringCollectionDef);
    SimpleWithUnionRepository = bigal.getRepository(SimpleWithUnionDef);
    TeacherRepository = bigal.getRepository(TeacherDef);
  });

  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  describe('#findOne()', () => {
    let store: StoreSelect;
    let product: ProductSelect;

    beforeEach(() => {
      store = generateStore();
      product = generateProduct({
        store: store.id,
      });
    });

    it('should support call without constraints', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));
      const result = await ReadonlyProductRepository.findOne({});
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with constraints as a parameter', async () => {
      const productResult = pick(product, 'id', 'name');
      mockedPool.query.mockResolvedValueOnce(getQueryResult([productResult]));

      const result = await ProductRepository.findOne({
        select: ['name'],
        where: {
          id: product.id,
        },
        sort: 'name asc',
      });
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual(productResult);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "name","id" FROM "products" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with sort as a parameter', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ReadonlyProductRepository.findOne({
        sort: 'name',
      });
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual(product);
      expect(result.name).toBe(product.name);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" ORDER BY "name" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with where constraint as a parameter', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product.id,
      });
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with where constraint as a parameter and querying id by entity value', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product,
      });
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with where constraint as a parameter and querying property by entity value', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        store,
      });
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with explicit pool override', async () => {
      const poolOverride = createMockPool();

      poolOverride.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        pool: poolOverride,
      }).where({
        id: product.id,
      });
      assert(result);
      expect(result).toStrictEqual(product);

      expect(mockedPool.query).not.toHaveBeenCalled();
      const [query, params] = poolOverride.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with chained where constraints', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({}).where({
        id: product.id,
      });
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with chained where constraints - Promise.all', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const [result] = await Promise.all([
        ProductRepository.findOne({}).where({
          id: product.id,
        }),
      ]);
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([product.id]);
    });

    it('should support call with chained sort', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({}).sort('name asc');
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with chained select', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

      const result = await ProductRepository.findOne({}).select(['name', 'sku']);
      assert(result);
      expect(result).toStrictEqual(product);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "name","sku","id" FROM "products" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    describe('Parse number columns', () => {
      it('should parse integer columns from integer query value', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const numberValue = 42;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              intColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);

        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should parse integer columns from float strings query value', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const numberValue = 42.24;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              intColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          intColumn: 42,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should parse integer columns that return as number', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const numberValue = 42;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              intColumn: numberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should ignore large integer columns values', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0`;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              intColumn: largeNumberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          intColumn: largeNumberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should parse float columns return as float strings', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const numberValue = 42.24;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should parse float columns return as number', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const numberValue = 42.24;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: numberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should ignore large float columns', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0.42`;
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: largeNumberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: largeNumberValue,
        });

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should parse float columns with trailing zeros from PostgreSQL numeric type', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: '0.00',
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: 0,
        });
      });

      it('should parse float columns with trailing zeros like "100.50"', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: '100.50',
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: 100.5,
        });
      });

      it('should not coerce non-numeric float column strings', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        const invalidValue = 'not-a-number';
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: invalidValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          id,
          name,
          floatColumn: invalidValue,
        });
      });
    });

    it('should support populating a single relation', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

      // @ts-expect-error -- populate types require Entity migration (bigal-n8x)
      const result = await ProductRepository.findOne({}).populate('store');
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating a single relation with implicit inherited pool override', async () => {
      const poolOverride = createMockPool();

      poolOverride.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

      const result = await ProductRepository.findOne({
        pool: poolOverride,
        // @ts-expect-error -- populate types require Entity migration (bigal-n8x)
      }).populate('store');

      expect(mockedPool.query).not.toHaveBeenCalled();
      expect(poolOverride.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = poolOverride.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [storeQuery, storeQueryParams] = poolOverride.query.mock.calls[1]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating a single relation with explicit pool override', async () => {
      const storePool = createMockPool();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));
      storePool.query.mockResolvedValueOnce(getQueryResult([store]));

      // @ts-expect-error -- populate types require Entity migration (bigal-n8x)
      const result = await ProductRepository.findOne({}).populate('store', {
        pool: storePool,
      });
      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(storePool.query).toHaveBeenCalledOnce();
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [storeQuery, storeQueryParams] = storePool.query.mock.calls[0]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating a single relation when column is missing from partial select', async () => {
      const productResult = pick(product, 'id', 'name', 'store');
      const storeResult = pick(store, 'id', 'name');
      mockedPool.query.mockResolvedValueOnce(getQueryResult([productResult])).mockResolvedValueOnce(getQueryResult([storeResult]));

      const result = await ProductRepository.findOne({
        select: ['name'],
        // @ts-expect-error -- populate types require Entity migration (bigal-n8x)
      }).populate('store', {
        select: ['name'],
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...productResult,
        store: storeResult,
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "name","store_id" AS "store","id" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(storeQuery).toBe('SELECT "name","id" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating a single relation as QueryResult with partial select', async () => {
      const levelThreeItem = generateLevelThree();
      const levelTwoItem = generateLevelTwo({ levelThree: levelThreeItem.id });
      const levelOneItem = generateLevelOne({ levelTwo: levelTwoItem.id });

      const levelOneResult = pick(levelOneItem, 'id', 'one', 'levelTwo');
      const levelTwoResult = pick(levelTwoItem, 'id', 'two', 'levelThree');

      mockedPool.query.mockResolvedValueOnce(getQueryResult([levelOneResult])).mockResolvedValueOnce(getQueryResult([levelTwoResult]));

      const result = await LevelOneRepository.findOne({
        select: ['one', 'levelTwo'],
        // @ts-expect-error -- populate types require Entity migration (bigal-n8x)
      }).populate('levelTwo', {
        select: ['two', 'levelThree'],
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...levelOneResult,
        levelTwo: levelTwoResult,
      });

      // @ts-expect-error -- populated levelTwo type not inferred without Entity migration
      expect(result.levelTwo.levelThree).toBe(levelThreeItem.id);
      // @ts-expect-error -- populated levelTwo type not inferred without Entity migration
      expect(result.levelTwo.levelThree.toUpperCase()).toBe(levelThreeItem.id.toUpperCase());
    });

    it('should support populating a single relation with partial select and order', async () => {
      const storeResult = pick(store, 'id', 'name');
      mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await ProductRepository.findOne({}).populate('store', {
        select: ['name'],
        sort: 'name',
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        store: storeResult,
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(storeQuery).toBe('SELECT "name","id" FROM "stores" WHERE "id"=$1 ORDER BY "name"');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating collection', async () => {
      const product1 = generateProduct({
        store: store.id,
      });
      const product2 = generateProduct({
        store: store.id,
      });

      const storeWithProducts = {
        ...store,
        products: [product1, product2],
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([store])).mockResolvedValueOnce(getQueryResult([product1, product2]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await StoreRepository.findOne({}).populate('products');
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual(storeWithProducts);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.products.length).toBe(2);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.products[0]!.id).toBe(product1.id);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.products[1]!.id).toBe(product2.id);
      // Make sure QueryResultPopulated types look ok
      expect(storeWithProducts.products.length).toBe(2);
      expect(storeWithProducts.products[0]!.id).toBe(product1.id);
      expect(storeWithProducts.products[1]!.id).toBe(product2.id);

      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([]);
      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating collection with implicit inherited pool override', async () => {
      const poolOverride = createMockPool();

      const product1 = generateProduct({
        store: store.id,
      });
      const product2 = generateProduct({
        store: store.id,
      });

      poolOverride.query.mockResolvedValueOnce(getQueryResult([store])).mockResolvedValueOnce(getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne({
        pool: poolOverride,
        // @ts-expect-error -- populate type constraint pending Entity migration
      }).populate('products');

      expect(mockedPool.query).not.toHaveBeenCalled();
      expect(poolOverride.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...store,
        products: [product1, product2],
      });

      const [storeQuery, storeQueryParams] = poolOverride.query.mock.calls[0]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([]);
      const [productQuery, productQueryParams] = poolOverride.query.mock.calls[1]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating collection with explicit pool override', async () => {
      const productPool = createMockPool();

      const product1 = generateProduct({
        store: store.id,
      });
      const product2 = generateProduct({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([store]));
      productPool.query.mockResolvedValueOnce(getQueryResult([product1, product2]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await StoreRepository.findOne({}).populate('products', {
        pool: productPool,
      });
      expect(mockedPool.query).toHaveBeenCalledOnce();
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...store,
        products: [product1, product2],
      });

      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([]);
      const [productQuery, productQueryParams] = productPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating collection with partial select and order', async () => {
      const product1 = generateProduct({
        store: store.id,
      });
      const product2 = generateProduct({
        store: store.id,
      });

      const product1Result = pick(product1, 'id', 'name');
      const product2Result = pick(product2, 'id', 'name');

      mockedPool.query.mockResolvedValueOnce(getQueryResult([store])).mockResolvedValueOnce(getQueryResult([product1Result, product2Result]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await StoreRepository.findOne({}).populate('products', {
        select: ['name'],
        sort: 'aliases',
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...store,
        products: [product1Result, product2Result],
      });

      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([]);
      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(productQuery).toBe('SELECT "name","id" FROM "products" WHERE "store_id"=$1 ORDER BY "alias_names"');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([store.id]);
    });

    it('should support populating multi-multi collection', async () => {
      const category1 = generateCategory();
      const category2 = generateCategory();
      const productCategory1Map = generateProductCategory(product, category1);
      const productCategory2Map = generateProductCategory(product, category2);

      mockedPool.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map]))
        .mockResolvedValueOnce(getQueryResult([category1, category2]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await ProductRepository.findOne({}).populate('categories');
      expect(mockedPool.query).toHaveBeenCalledTimes(3);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
      expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
    });

    it('should support populating multi-multi collection with implicit inherited pool override', async () => {
      const poolOverride = createMockPool();
      const category1 = generateCategory();
      const category2 = generateCategory();
      const productCategory1Map = generateProductCategory(product, category1);
      const productCategory2Map = generateProductCategory(product, category2);

      poolOverride.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map]))
        .mockResolvedValueOnce(getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne({
        pool: poolOverride,
        // @ts-expect-error -- populate type constraint pending Entity migration
      }).populate('categories');

      expect(mockedPool.query).not.toHaveBeenCalled();
      expect(poolOverride.query).toHaveBeenCalledTimes(3);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = poolOverride.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = poolOverride.query.mock.calls[1]!;
      expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      const [categoryQuery, categoryQueryParams] = poolOverride.query.mock.calls[2]!;
      expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
    });

    it('should support populating multi-multi collection with explicit pool override', async () => {
      const categoryPool = createMockPool();

      const category1 = generateCategory();
      const category2 = generateCategory();
      const productCategory1Map = generateProductCategory(product, category1);
      const productCategory2Map = generateProductCategory(product, category2);

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));
      categoryPool.query.mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map])).mockResolvedValueOnce(getQueryResult([category1, category2]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await ProductRepository.findOne({}).populate('categories', {
        pool: categoryPool,
      });

      expect(mockedPool.query).toHaveBeenCalledOnce();
      expect(categoryPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = categoryPool.query.mock.calls[0]!;
      expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      const [categoryQuery, categoryQueryParams] = categoryPool.query.mock.calls[1]!;
      expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
    });

    it('should support populating multi-multi collection with partial select and order', async () => {
      const category1 = generateCategory();
      const category2 = generateCategory();
      const productCategory1Map = generateProductCategory(product, category1);
      const productCategory2Map = generateProductCategory(product, category2);

      const category1Result = pick(category1, 'id', 'name');
      const category2Result = pick(category2, 'id', 'name');

      mockedPool.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map]))
        .mockResolvedValueOnce(getQueryResult([category1Result, category2Result]));

      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await ProductRepository.findOne({}).populate('categories', {
        select: ['name'],
        sort: 'name desc',
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(3);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        categories: [category1Result, category2Result],
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
      expect(categoryQuery).toBe('SELECT "name","id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name" DESC');
      assert(categoryQueryParams);
      expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
    });

    it('should support populating self reference collection', async () => {
      const source1 = generateSimpleWithSelfReference();
      const translation1 = generateSimpleWithSelfReference({
        name: 'translation1',
        source: source1.id,
      });
      const translation2 = generateSimpleWithSelfReference({
        name: 'translation2',
        source: source1.id,
      });

      const source1Result = pick(source1, 'id', 'name');

      mockedPool.query.mockResolvedValueOnce(getQueryResult([source1Result])).mockResolvedValueOnce(getQueryResult([translation1, translation2]));

      const result = await SimpleWithSelfReferenceRepository.findOne({
        select: ['name'],
      })
        .where({
          id: source1.id,
        })
        // @ts-expect-error -- populate type constraint pending Entity migration
        .populate('translations');
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...source1Result,
        translations: [translation1, translation2],
      });
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.translations.length).toBe(2);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.translations[0]!.id).toBe(translation1.id);

      const [sourceQuery, sourceQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(sourceQuery).toBe('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      assert(sourceQueryParams);
      expect(sourceQueryParams).toStrictEqual([source1.id]);
      const [translationsQuery, translationsQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(translationsQuery).toBe('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=$1');
      assert(translationsQueryParams);
      expect(translationsQueryParams).toStrictEqual([source1.id]);
    });

    it('should support populating collection and not explicitly selecting relation column', async () => {
      const source1 = generateSimpleWithSelfReference();
      const translation1 = generateSimpleWithSelfReference({
        name: 'translation1',
        source: source1.id,
      });
      const translation2 = generateSimpleWithSelfReference({
        name: 'translation2',
        source: source1.id,
      });

      const source1Result = pick(source1, 'id', 'name');
      const translation1Result = pick(translation1, 'id', 'name');
      const translation2Result = pick(translation2, 'id', 'name');

      mockedPool.query.mockResolvedValueOnce(getQueryResult([source1Result])).mockResolvedValueOnce(getQueryResult([translation1Result, translation2Result]));

      const result = await SimpleWithSelfReferenceRepository.findOne({
        select: ['name'],
      })
        .where({
          id: source1.id,
        })
        // @ts-expect-error -- populate type constraint pending Entity migration
        .populate('translations', {
          select: ['id', 'name'],
        });
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...source1Result,
        translations: [translation1Result, translation2Result],
      });
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.translations.length).toBe(2);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(result.translations[0]!.id).toBe(translation1.id);

      const [sourceQuery, sourceQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(sourceQuery).toBe('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      assert(sourceQueryParams);
      expect(sourceQueryParams).toStrictEqual([source1.id]);
      const [translationsQuery, translationsQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(translationsQuery).toBe('SELECT "id","name" FROM "simple" WHERE "source_id"=$1');
      assert(translationsQueryParams);
      expect(translationsQueryParams).toStrictEqual([source1.id]);
    });

    it('should support complex query with multiple chained modifiers', async () => {
      const category1 = generateCategory();
      const category2 = generateCategory();
      const productCategory1Map = generateProductCategory(product, category1);
      const productCategory2Map = generateProductCategory(product, category2);

      mockedPool.query
        .mockResolvedValueOnce(getQueryResult([product]))
        .mockResolvedValueOnce(getQueryResult([store]))
        .mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map]))
        .mockResolvedValueOnce(getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne({})
        .where({
          store: store.id,
        })
        // @ts-expect-error -- populate type constraint pending Entity migration
        .populate('store', {
          where: {
            name: {
              like: 'store%',
            },
          },
        })
        // @ts-expect-error -- populate type constraint pending Entity migration
        .populate('categories', {
          where: {
            name: {
              startsWith: 'category',
            },
          },
          sort: 'name',
          limit: 2,
        })
        .sort('store desc');
      expect(mockedPool.query).toHaveBeenCalledTimes(4);
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...product,
        store,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      assert(productQueryParams);
      expect(productQueryParams).toStrictEqual([store.id]);
      const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1 AND "name" ILIKE $2');
      assert(storeQueryParams);
      expect(storeQueryParams).toStrictEqual([store.id, 'store%']);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[2]!;
      expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[3]!;
      expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      assert(categoryQueryParams);
      expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id], 'category%']);
    });

    describe('through options', () => {
      it('should filter by junction table columns with through.where', async () => {
        const category1 = generateCategory();
        const category2 = generateCategory();
        const productCategory1Map = {
          ...generateProductCategory(product, category1),
          isPrimary: true,
        };
        // productCategory2Map is not returned from the junction query due to isPrimary filter
        generateProductCategory(product, category2);

        // Only return the primary category mapping from junction query
        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product]))
          .mockResolvedValueOnce(getQueryResult([productCategory1Map]))
          .mockResolvedValueOnce(getQueryResult([category1]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('categories', {
          through: {
            where: { isPrimary: true },
          },
        });

        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        assert(result);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual({
          ...product,
          categories: [category1],
        });

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1 AND "is_primary"=$2');
        assert(productCategoryMapQueryParams);
        expect(productCategoryMapQueryParams).toStrictEqual([product.id, true]);
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=$1');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([category1.id]);
      });

      it('should order by junction table columns with through.sort', async () => {
        const category1 = generateCategory();
        const category2 = generateCategory();
        const productCategory1Map = {
          ...generateProductCategory(product, category1),
          ordering: 2,
        };
        const productCategory2Map = {
          ...generateProductCategory(product, category2),
          ordering: 1,
        };

        // Junction query returns in ordering order (category2 first, then category1)
        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product]))
          .mockResolvedValueOnce(getQueryResult([productCategory2Map, productCategory1Map]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('categories', {
          through: {
            sort: 'ordering asc',
          },
        });

        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        assert(result);
        // Categories should be in junction order: category2 (ordering=1) before category1 (ordering=2)
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories).toHaveLength(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories[0]!.id).toBe(category2.id);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories[1]!.id).toBe(category1.id);

        const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1 ORDER BY "ordering"');
        assert(productCategoryMapQueryParams);
        expect(productCategoryMapQueryParams).toStrictEqual([product.id]);
      });

      it('should combine through.where and through.sort', async () => {
        const category1 = generateCategory();
        const category2 = generateCategory();
        const productCategory1Map = {
          ...generateProductCategory(product, category1),
          ordering: 2,
          isPrimary: true,
        };
        const productCategory2Map = {
          ...generateProductCategory(product, category2),
          ordering: 1,
          isPrimary: true,
        };

        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product]))
          .mockResolvedValueOnce(getQueryResult([productCategory2Map, productCategory1Map]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('categories', {
          through: {
            where: { isPrimary: true },
            sort: 'ordering asc',
          },
        });

        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        assert(result);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories[0]!.id).toBe(category2.id);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories[1]!.id).toBe(category1.id);

        const [productCategoryMapQuery, productCategoryMapQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryMapQuery).toBe(
          'SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1 AND "is_primary"=$2 ORDER BY "ordering"',
        );
        assert(productCategoryMapQueryParams);
        expect(productCategoryMapQueryParams).toStrictEqual([product.id, true]);
      });

      it('should combine through options with target where filter', async () => {
        const category1 = generateCategory({ name: 'Active Category' });
        const category2 = generateCategory({ name: 'Deleted Category' });
        const productCategory1Map = {
          ...generateProductCategory(product, category1),
          isPrimary: true,
        };
        const productCategory2Map = {
          ...generateProductCategory(product, category2),
          isPrimary: true,
        };

        // Junction returns both, but target where filters to only category1
        // Only category1 matches target where
        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product]))
          .mockResolvedValueOnce(getQueryResult([productCategory1Map, productCategory2Map]))
          .mockResolvedValueOnce(getQueryResult([category1]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('categories', {
          where: { name: { startsWith: 'Active' } },
          through: {
            where: { isPrimary: true },
          },
        });

        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        assert(result);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories).toHaveLength(1);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories[0]!.id).toBe(category1.id);

        const [productCategoryMapQuery] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryMapQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1 AND "is_primary"=$2');
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id], 'Active%']);
      });

      it('should not run target query when through.where filters out all junction records', async () => {
        // No junction records match
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('categories', {
          through: {
            where: { isPrimary: true },
          },
        });

        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        assert(result);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(result.categories).toStrictEqual([]);
      });
    });

    it('should return plain objects without instance methods across multiple queries', async () => {
      const result = {
        id: faker.number.int(),
        name: `sink - ${faker.string.uuid()}`,
      };
      mockedPool.query.mockResolvedValueOnce(getQueryResult([result])).mockResolvedValueOnce(getQueryResult([result]));

      const result1 = await ReadonlyKitchenSinkRepository.findOne({});
      const result2 = await ReadonlyKitchenSinkRepository.findOne({});

      expect(mockedPool.query).toHaveBeenCalledTimes(2);

      assert(result1);
      expect(result1).toStrictEqual(result2);
      // Plain objects should not have instance methods
      expect('instanceFunction' in result1).toBe(false);
      assert(result2);
      expect('instanceFunction' in result2).toBe(false);
    });

    it('should not create an object/assign instance functions to null results', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([null as never]));

      const result = await ReadonlyKitchenSinkRepository.findOne({});

      expect(mockedPool.query).toHaveBeenCalledOnce();

      expect(result).toBeNull();
    });

    it('should allow querying required string array', async () => {
      const anotherSimple = generateSimpleWithStringId();
      const otherSimple = generateSimpleWithStringId({
        otherId: anotherSimple.id,
      });
      const simple = generateSimpleWithStringCollection();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));

      const result = await SimpleWithStringCollectionRepository.findOne({
        or: [
          {
            id: simple.id,
          },
          {
            otherIds: [otherSimple.id, anotherSimple.id],
          },
        ],
      });
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","other_ids" AS "otherIds" FROM "simple" WHERE (("id"=$1) OR (($2=ANY("other_ids") OR $3=ANY("other_ids")))) LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.id, otherSimple.id, anotherSimple.id]);
    });

    it('should support an object with an enum/union field', async () => {
      const simple = generateSimpleWithUnion();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithUnionRepository.findOne({}).where({
        status: ['Bar', 'Foo'],
      });
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "status"=ANY($1::TEXT[]) LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([['Bar', 'Foo']]);
    });

    it('should support an object with negated enum/union field', async () => {
      const simple = generateSimpleWithUnion();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithUnionRepository.findOne({}).where({
        status: {
          '!': ['Bar', 'Foo'],
        },
      });
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "status"<>ALL($1::TEXT[]) LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([['Bar', 'Foo']]);
    });

    it('should support an object with an optional enum/union field', async () => {
      const simple = generateSimpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnumSelect> = {
        name: simple.name,
      };

      const { status } = simple;

      if (status) {
        whereClause.status = {
          like: status,
        };
      }

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne({}).where(whereClause);
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" ILIKE $2 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.name, status]);
    });

    it('should support an object with an optional enum/union array', async () => {
      const simple = generateSimpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnumSelect> = {
        name: simple.name,
        status: {
          like: ['Bar', 'Foo', null],
        },
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne({}).where(whereClause);
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND ("status" ILIKE $2 OR "status" ILIKE $3 OR "status" IS NULL) LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.name, 'Bar', 'Foo']);
    });

    it('should support an object with an optional negated enum/union field', async () => {
      const simple = generateSimpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnumSelect> = {
        name: simple.name,
      };

      const { status } = simple;

      if (status) {
        whereClause.status = {
          '!': {
            like: status,
          },
        };
      }

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne({}).where(whereClause);
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" NOT ILIKE $2 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.name, status]);
    });

    it('should support an object with an optional negated enum/union array', async () => {
      const simple = generateSimpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnumSelect> = {
        name: simple.name,
        status: {
          '!': {
            like: ['Bar', 'Foo', null],
          },
        },
      };

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne({}).where(whereClause);
      assert(result);
      expect(result).toStrictEqual(simple);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" NOT ILIKE $2 AND "status" NOT ILIKE $3 AND "status" IS NOT NULL LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.name, 'Bar', 'Foo']);
    });

    it('should support an object with a json field', async () => {
      const simple = generateSimpleWithJson();

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithJsonRepository.findOne({});
      assert(result);
      expect(result).toStrictEqual(simple);
      assert(result.keyValue);
      expect(result.keyValue).toStrictEqual(simple.keyValue);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","bar","key_value" AS "keyValue" FROM "simple" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support an object with a json field (with id property)', async () => {
      const simple = generateSimpleWithRelationAndJson({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple]));
      const result = await SimpleWithRelationAndJsonRepository.findOne({}).where({
        or: [
          {
            name: simple.name,
            id: simple.id,
          },
        ],
        id: 42,
      });
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual(simple);
      assert(result.message);
      // @ts-expect-error -- message property type pending Entity migration
      expect(result.message.id).toBe(simple.message.id);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","store_id" AS "store","message" FROM "simple" WHERE ("name"=$1 AND "id"=$2) AND "id"=$3 LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([simple.name, simple.id, 42]);
    });

    it('should support an object with a json field (with id property) and populate statement', async () => {
      const simple = generateSimpleWithRelationAndJson({
        store: store.id,
      });

      const storeResult = pick(store, 'id', 'name');

      mockedPool.query.mockResolvedValueOnce(getQueryResult([simple])).mockResolvedValueOnce(getQueryResult([storeResult]));
      // @ts-expect-error -- populate type constraint pending Entity migration
      const result = await SimpleWithRelationAndJsonRepository.findOne({}).populate('store', {
        select: ['name'],
      });
      assert(result);
      // eslint-disable-next-line vitest-js/prefer-strict-equal
      expect(result).toEqual({
        ...simple,
        store: storeResult,
      });
      assert(result.message);
      // @ts-expect-error -- message property type pending Entity migration
      expect(result.message.id).toBe(simple.message.id);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","store_id" AS "store","message" FROM "simple" LIMIT 1');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      mockedPool.query
        .mockResolvedValueOnce(
          getQueryResult([
            {
              id: faker.number.int(),
              name: 'Product',
              store: store.id,
            },
          ]),
        )
        .mockResolvedValueOnce(getQueryResult([store]));

      // @ts-expect-error -- UNSAFE_withOriginalFieldType param not typed for inferred schemas
      const productResult = await ProductRepository.findOne({}).UNSAFE_withOriginalFieldType('store');
      assert(productResult);
      const storeResult = await StoreRepository.findOne({}).where({
        // @ts-expect-error -- UNSAFE_withOriginalFieldType returns unknown for FK fields
        id: productResult.store,
      });
      assert(storeResult);

      productResult.store = storeResult;
      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.id).toBe(store.id);
      // @ts-expect-error -- populated property type pending Entity migration
      assert(productResult.store.name);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.name).toBe(store.name);
    });

    it('should support manually setting a field - UNSAFE_withFieldValue()', async () => {
      mockedPool.query
        .mockResolvedValueOnce(
          getQueryResult([
            {
              id: faker.number.int(),
              name: 'Product',
              store: store.id,
            },
          ]),
        )
        .mockResolvedValueOnce(getQueryResult([store]));

      const productResult = await ProductRepository.findOne({}).UNSAFE_withFieldValue('store', store);
      assert(productResult);

      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.id).toBe(store.id);
      // @ts-expect-error -- populated property type pending Entity migration
      assert(productResult.store.name);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.name).toBe(store.name);
    });

    describe('toJSON()', () => {
      it('should return plain object without prototype chain', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product]));

        const result = await ProductRepository.findOne({});

        expect(result).toBeDefined();
        expect(Object.getPrototypeOf(result!)).toBe(Object.prototype);
      });

      it('should return null when no results', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        const result = await ProductRepository.findOne({});

        expect(result).toBeNull();
      });

      it('should cascade to populated entities', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.findOne({}).populate('store');

        expect(result).toBeDefined();
        expect(Object.getPrototypeOf(result!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result!.store)).toBe(Object.prototype);
      });

      it('should parse float columns with trailing zeros in plain objects', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              floatColumn: '0.00',
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        expect(result.floatColumn!).toBe(0);
      });

      it('should parse integer columns in plain objects (regression check)', async () => {
        const id = faker.number.int();
        const name = faker.string.uuid();
        mockedPool.query.mockResolvedValueOnce(
          getQueryResult([
            {
              id,
              name,
              intColumn: '42',
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne({});
        assert(result);
        expect(result.intColumn!).toBe(42);
      });
    });
  });

  describe('#find()', () => {
    let store: StoreSelect;

    beforeEach(() => {
      store = generateStore();
    });

    it('should support call without constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({});
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with constraints as a parameter', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({
        select: ['name'],
        where: {
          id: products.map((item) => item.id),
          store: store.id,
        },
        sort: 'name asc',
        skip: 5,
        limit: 24,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "name","id" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call with where constraint as a parameter', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({
        id: products.map((item) => item.id),
        store: store.id,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call with explicit pool override', async () => {
      const poolOverride = createMockPool();
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      poolOverride.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({
        pool: poolOverride,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      expect(mockedPool.query).not.toHaveBeenCalled();
      const [query, params] = poolOverride.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with chained where constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).where({
        store: store.id,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained where constraints - array ILIKE array of values', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).where({
        or: [
          {
            name: {
              like: 'product',
            },
          },
          {
            name: {
              like: 'Foo Bar',
            },
          },
        ],
        aliases: {
          like: ['Foo', 'BAR'],
        },
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe(
        'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE (("name" ILIKE $1) OR ("name" ILIKE $2)) AND (EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $3) OR EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $4))',
      );
      assert(params);
      expect(params).toStrictEqual(['product', 'Foo Bar', 'Foo', 'BAR']);
    });

    it('should support call with chained where constraints - NOT ILIKE array of values', async () => {
      const products = [
        generateProduct({
          store: store.id,
          sku: faker.string.uuid(),
        }),
        generateProduct({
          store: store.id,
          sku: faker.string.uuid(),
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).where({
        sku: {
          '!': {
            like: ['Foo', 'BAR'],
          },
        },
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "sku" NOT ILIKE $1 AND "sku" NOT ILIKE $2');
      assert(params);
      expect(params).toStrictEqual(['Foo', 'BAR']);
    });

    it('should support call with chained where constraints - Promise.all', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.find({}).where({
          store: store.id,
        }),
      ]);
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained sort', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).sort('name asc');
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with chained limit', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).limit(42);
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 42');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with chained skip', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).skip(24);
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" OFFSET 24');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with chained paginate', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).paginate({
        page: 3,
        limit: 100,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 100 OFFSET 200');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should allow multiple where constraints in an or clause', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const orStatements: WhereQuery<ProductSelect>[] = [
        {
          sku: {
            like: 'foo',
          },
        },
      ];

      // Will always be true in this test
      const location = store.name?.toLowerCase().trim() ?? '';
      if (store.name) {
        orStatements.push({
          location: {
            like: location,
          },
        });
      }

      const result = await ProductRepository.find({
        select: ['name'],
        where: {
          store: store.id,
          or: orStatements,
        },
        sort: 'name asc',
        skip: 5,
        limit: 24,
      });
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "name","id" FROM "products" WHERE "store_id"=$1 AND (("sku" ILIKE $2) OR ("location" ILIKE $3)) ORDER BY "name" LIMIT 24 OFFSET 5');
      assert(params);
      expect(params).toStrictEqual([store.id, 'foo', location]);
    });

    it('should support complex query with multiple chained modifiers', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

      const result = await ProductRepository.find({})
        .where({
          store: store.id,
        })
        .skip(24)
        .limit(42)
        .sort('store desc');

      expect(mockedPool.query).toHaveBeenCalledOnce();
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should return plain objects without instance methods across multiple queries', async () => {
      const result = {
        id: faker.number.int(),
        name: `sink - ${faker.string.uuid()}`,
      };
      mockedPool.query.mockResolvedValueOnce(getQueryResult([result])).mockResolvedValueOnce(getQueryResult([result]));

      const result1 = await ReadonlyKitchenSinkRepository.find({});
      const result2 = await ReadonlyKitchenSinkRepository.find({});
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
      assert(result1);
      assert(result2);
      expect(result1).toStrictEqual(result2);
      expect('instanceFunction' in result1[0]!).toBe(false);
      expect('instanceFunction' in result2[0]!).toBe(false);
    });

    it('should allow types when used in promise.all with other queries', async () => {
      const three1 = generateLevelThree({
        foo: `three1: ${faker.string.uuid()}`,
      });
      const three2 = generateLevelThree({
        foo: `three2: ${faker.string.uuid()}`,
      });
      const two = generateLevelTwo({
        foo: `two: ${faker.string.uuid()}`,
        levelThree: three1.id,
      });
      const one = generateLevelOne({
        foo: `one: ${faker.string.uuid()}`,
        levelTwo: two.id,
      });
      mockedPool.query
        .mockResolvedValueOnce(getQueryResult([one]))
        .mockResolvedValueOnce(getQueryResult([two]))
        .mockResolvedValueOnce(getQueryResult([three1, three2]));

      assert(one.foo);
      assert(two.foo);
      assert(three1.foo);
      assert(three2.foo);

      const [ones, twoResult, threes] = await Promise.all([
        LevelOneRepository.find({
          select: ['one'],
        }).where({
          foo: [one.foo, two.foo, three1.foo.toUpperCase(), three2.foo.toUpperCase()],
        }),
        LevelTwoRepository.findOne({}),
        LevelThreeRepository.find({
          select: ['three', 'foo'],
        }).where({
          foo: [three1.foo, three2.foo],
        }),
      ]);

      expect(mockedPool.query).toHaveBeenCalledTimes(3);
      expect(ones).toStrictEqual([one]);
      expect(ones.length).toBe(1);
      expect(ones[0]!.one).toStrictEqual(one.one);

      assert(twoResult);
      expect(twoResult).toStrictEqual(two);
      expect(twoResult.two).toStrictEqual(two.two);

      expect(threes).toStrictEqual([three1, three2]);
      expect(threes.length).toBe(2);
      expect(threes[0]!.three).toBe(three1.three);
      expect(threes[1]!.three).toBe(three2.three);

      const [levelOneQuery, levelOneQueryParams] = mockedPool.query.mock.calls[0]!;
      expect(levelOneQuery).toBe('SELECT "one","id" FROM "level_one" WHERE "foo"=ANY($1::TEXT[])');
      assert(levelOneQueryParams);
      expect(levelOneQueryParams).toStrictEqual([[one.foo, two.foo, three1.foo.toUpperCase(), three2.foo.toUpperCase()]]);

      const [levelTwoQuery, levelTwoQueryParams] = mockedPool.query.mock.calls[1]!;
      expect(levelTwoQuery).toBe('SELECT "id","two","foo","level_three_id" AS "levelThree" FROM "level_two" LIMIT 1');
      assert(levelTwoQueryParams);
      expect(levelTwoQueryParams).toStrictEqual([]);

      const [levelThreeQuery, levelThreeQueryParams] = mockedPool.query.mock.calls[2]!;
      expect(levelThreeQuery).toBe('SELECT "three","foo","id" FROM "level_three" WHERE "foo"=ANY($1::TEXT[])');
      assert(levelThreeQueryParams);
      expect(levelThreeQueryParams).toStrictEqual([[three1.foo, three2.foo]]);
    });

    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      const product = generateProduct({
        store: store.id,
      });

      mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

      // @ts-expect-error -- UNSAFE_withOriginalFieldType type pending Entity migration
      const products = await ProductRepository.find({}).UNSAFE_withOriginalFieldType('store');
      expect(products.length).toBe(1);
      const [productResult] = products;
      assert(productResult);

      const stores = await StoreRepository.find({}).where({
        // @ts-expect-error -- UNSAFE_withOriginalFieldType returns unknown for FK fields
        id: productResult.store,
      });
      expect(stores.length).toBe(1);
      const [storeResult] = stores;
      assert(storeResult);

      productResult.store = storeResult;
      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.id).toBe(store.id);
      // @ts-expect-error -- populated property type pending Entity migration
      assert(productResult.store.name);
      // @ts-expect-error -- populated property type pending Entity migration
      expect(productResult.store.name).toBe(store.name);
    });

    it('should support call with chained select', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
      const result = await ProductRepository.find({}).select(['name', 'sku']);
      assert(result);
      expect(result).toStrictEqual(products);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "name","sku","id" FROM "products"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    describe('join', () => {
      it('should support inner join with nested where clause', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({})
          .join('store')
          .where({
            store: {
              // @ts-expect-error -- joined table filter not typed for inferred schemas
              name: {
                like: 'Acme',
              },
            },
          });
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" INNER JOIN "stores" AS "store" ON "products"."store_id"="store"."id" WHERE "store"."name" ILIKE $1',
        );
        assert(params);
        expect(params).toStrictEqual(['Acme']);
      });

      it('should support left join with nested where clause', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({})
          .leftJoin('store')
          .where({
            // @ts-expect-error -- joined table filter not typed for inferred schemas
            store: { name: { like: '%mart%' } },
          });
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" LEFT JOIN "stores" AS "store" ON "products"."store_id"="store"."id" WHERE "store"."name" ILIKE $1',
        );
        assert(params);
        expect(params).toStrictEqual(['%mart%']);
      });

      it('should support join with alias and nested where clause', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({})
          .join('store', 'primaryStore')
          .where({
            // @ts-expect-error -- joined table filter not typed for inferred schemas
            primaryStore: { name: 'Acme' },
          });
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" INNER JOIN "stores" AS "primaryStore" ON "products"."store_id"="primaryStore"."id" WHERE "primaryStore"."name"=$1',
        );
        assert(params);
        expect(params).toStrictEqual(['Acme']);
      });

      it('should support join with mixed nested and regular where constraints', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({})
          .join('store')
          .where({
            name: 'Widget',
            // @ts-expect-error -- joined table filter not typed for inferred schemas
            store: { name: 'Acme' },
          });
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" INNER JOIN "stores" AS "store" ON "products"."store_id"="store"."id" WHERE "name"=$1 AND "store"."name"=$2',
        );
        assert(params);
        expect(params).toStrictEqual(['Widget', 'Acme']);
      });

      it('should support sort with dot notation for joined table', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({}).join('store').sort('store.name asc');
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" INNER JOIN "stores" AS "store" ON "products"."store_id"="store"."id" ORDER BY "store"."name"',
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should support sort with dot notation descending', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));
        const result = await ProductRepository.find({}).join('store', 'primaryStore').sort('primaryStore.name desc');
        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" INNER JOIN "stores" AS "primaryStore" ON "products"."store_id"="primaryStore"."id" ORDER BY "primaryStore"."name" DESC',
        );
        assert(params);
        expect(params).toStrictEqual([]);
      });
    });

    describe('subquery', () => {
      it('should support WHERE IN with subquery', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const activeStores = subquery(StoreRepository).select(['id']).where({ name: 'Acme' });
        const result = await ProductRepository.find({}).where({
          store: { in: activeStores },
        });

        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "name"=$1)');
        assert(params);
        expect(params).toStrictEqual(['Acme']);
      });

      it('should support WHERE NOT IN with subquery using negation', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const inactiveStores = subquery(StoreRepository).select(['id']).where({ name: 'Inactive' });
        const result = await ProductRepository.find({}).where({
          store: { '!': { in: inactiveStores } },
        });

        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id" NOT IN (SELECT "id" FROM "stores" WHERE "name"=$1)');
        assert(params);
        expect(params).toStrictEqual(['Inactive']);
      });

      it('should support WHERE EXISTS with subquery', async () => {
        const stores = [generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const hasProducts = subquery(ProductRepository).where({ name: 'Widget' });
        const result = await StoreRepository.find({}).where({
          exists: hasProducts,
        });

        assert(result);
        expect(result).toStrictEqual(stores);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name" FROM "stores" WHERE EXISTS (SELECT 1 FROM "products" WHERE "name"=$1)');
        assert(params);
        expect(params).toStrictEqual(['Widget']);
      });

      it('should support WHERE NOT EXISTS with subquery using negation', async () => {
        const stores = [generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const hasDiscontinued = subquery(ProductRepository).where({ name: 'Discontinued' });
        const result = await StoreRepository.find({}).where({
          '!': { exists: hasDiscontinued },
        });

        assert(result);
        expect(result).toStrictEqual(stores);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name" FROM "stores" WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "name"=$1)');
        assert(params);
        expect(params).toStrictEqual(['Discontinued']);
      });

      it('should support scalar subquery with comparison operator', async () => {
        const stores = [generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const productCount = subquery(ProductRepository).where({ name: 'Widget' }).count();
        const result = await StoreRepository.find({}).where({
          id: { '>': productCount },
        });

        assert(result);
        expect(result).toStrictEqual(stores);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name" FROM "stores" WHERE "id">(SELECT COUNT(*) FROM "products" WHERE "name"=$1)');
        assert(params);
        expect(params).toStrictEqual(['Widget']);
      });

      it('should support subquery with sort and limit', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const topStores = subquery(StoreRepository)
          .select(['id'])
          .where({ name: { like: 'A%' } })
          .sort('name')
          .limit(10);
        const result = await ProductRepository.find({}).where({
          store: { in: topStores },
        });

        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "name" ILIKE $1 ORDER BY "name" LIMIT 10)',
        );
        assert(params);
        expect(params).toStrictEqual(['A%']);
      });

      it('should support combining subquery with other where conditions', async () => {
        const products = [
          generateProduct({
            store: store.id,
          }),
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const premiumStores = subquery(StoreRepository).select(['id']).where({ name: 'Premium' });
        const result = await ProductRepository.find({}).where({
          name: 'Widget',
          store: { in: premiumStores },
        });

        assert(result);
        expect(result).toStrictEqual(products);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "name"=$1 AND "store_id" IN (SELECT "id" FROM "stores" WHERE "name"=$2)',
        );
        assert(params);
        expect(params).toStrictEqual(['Widget', 'Premium']);
      });

      describe('subquery joins', () => {
        it('should support inner join to subquery with COUNT aggregate', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .groupBy(['store']);

          const result = await StoreRepository.find({}).join(productCounts, 'productStats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should support left join to subquery', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .groupBy(['store']);

          const result = await StoreRepository.find({}).leftJoin(productCounts, 'productStats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" LEFT JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should support sorting by subquery column', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .groupBy(['store']);

          const result = await StoreRepository.find({})
            .join(productCounts, 'productStats', { on: { id: 'store' } })
            // Type assertion needed because Sort<StoreSelect> doesn't include joined column aliases
            .sort('productStats.productCount desc' as Sort<StoreSelect>);

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store" ORDER BY "productStats"."productCount" DESC',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should support subquery join with WHERE in subquery', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const widgetCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('widgetCount')])
            .where({ name: 'Widget' })
            .groupBy(['store']);

          const result = await StoreRepository.find({}).join(widgetCounts, 'widgetStats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "widgetCount" FROM "products" WHERE "name"=$1 GROUP BY "store_id") AS "widgetStats" ON "stores"."id"="widgetStats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual(['Widget']);
        });

        it('should support COUNT DISTINCT in subquery join', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const uniqueProductCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count('name').distinct().as('uniqueNames')])
            .groupBy(['store']);

          const result = await StoreRepository.find({}).join(uniqueProductCounts, 'stats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(DISTINCT "name") AS "uniqueNames" FROM "products" GROUP BY "store_id") AS "stats" ON "stores"."id"="stats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should support subquery join with HAVING clause', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .groupBy(['store'])
            .having({ productCount: { '>': 5 } });

          const result = await StoreRepository.find({}).join(productCounts, 'productStats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id" HAVING COUNT(*)>5) AS "productStats" ON "stores"."id"="productStats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should support subquery join with HAVING and WHERE', async () => {
          const stores = [generateStore()];

          mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .where({ name: { '!': null } })
            .groupBy(['store'])
            .having({ productCount: { '>=': 3 } });

          const result = await StoreRepository.find({}).join(productCounts, 'productStats', { on: { id: 'store' } });

          assert(result);
          expect(result).toStrictEqual(stores);

          const [query, params] = mockedPool.query.mock.calls[0]!;
          expect(query).toBe(
            'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" WHERE "name" IS NOT NULL GROUP BY "store_id" HAVING COUNT(*)>=3) AS "productStats" ON "stores"."id"="productStats"."store"',
          );
          assert(params);
          expect(params).toStrictEqual([]);
        });

        it('should throw error when joining subquery without alias', async () => {
          const productCounts = subquery(ProductRepository)
            .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
            .groupBy(['store']);

          let thrownError: Error | undefined;

          try {
            // @ts-expect-error - intentionally passing undefined for alias to test runtime error
            await StoreRepository.find({}).join(productCounts, undefined, { on: { id: 'store' } });
          } catch (ex) {
            thrownError = ex as Error;
          }

          expect(thrownError).toBeDefined();
          expect(thrownError!.message).toBe('Alias is required when joining to a subquery');
        });

        describe('type-safe subquery column sorting', () => {
          it('should support sorting by subquery column without type cast', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const productCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
              .groupBy(['store']);

            const result = await StoreRepository.find({})
              .join(productCounts, 'productStats', { on: { id: 'store' } })
              .sort('productStats.productCount desc');

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store" ORDER BY "productStats"."productCount" DESC',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });

          it('should support sorting by subquery property column without type cast', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const productCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
              .groupBy(['store']);

            const result = await StoreRepository.find({})
              .join(productCounts, 'productStats', { on: { id: 'store' } })
              .sort('productStats.store asc');

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store" ORDER BY "productStats"."store"',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });

          it('should reject invalid subquery column names at compile time', () => {
            // This test verifies TypeScript catches invalid column names at compile time.
            // The @ts-expect-error directive on the .sort() call confirms the type error is detected.
            const productCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
              .groupBy(['store']);

            // We don't actually execute this - just building it to verify types
            const _query = StoreRepository.find({})
              .join(productCounts, 'productStats', { on: { id: 'store' } })
              // @ts-expect-error - 'invalidColumn' is not a selected column in the subquery
              .sort('productStats.invalidColumn desc');

            // The existence of @ts-expect-error above proves the type system rejects invalid columns
            assert(_query);
          });

          it('should support mixed model and subquery joins with type-safe sorting', async () => {
            const testStore = generateStore();
            const products = [generateProduct({ store: testStore.id })];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

            const categoryCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'categoryProductCount'> => sb.count().as('categoryProductCount')])
              .groupBy(['store']);

            const result = await ProductRepository.find({})
              .join('store')
              .join(categoryCounts, 'stats', { on: { store: 'store' } })
              .sort('store.name asc')
              .sort('stats.categoryProductCount desc');

            assert(result);
            expect(result).toStrictEqual(products);
          });

          it('should support multiple subquery joins with type-safe sorting', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const productCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
              .groupBy(['store']);

            const avgPrices = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'avgPrice'> => sb.avg('id').as('avgPrice')])
              .groupBy(['store']);

            const result = await StoreRepository.find({})
              .join(productCounts, 'counts', { on: { id: 'store' } })
              .join(avgPrices, 'prices', { on: { id: 'store' } })
              .sort('counts.productCount desc')
              .sort('prices.avgPrice asc');

            assert(result);
            expect(result).toStrictEqual(stores);
          });

          it('should support left join with type-safe subquery sorting', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const productCounts = subquery(ProductRepository)
              .select(['store', (sb): TypedAggregateExpression<'productCount'> => sb.count().as('productCount')])
              .groupBy(['store']);

            const result = await StoreRepository.find({})
              .leftJoin(productCounts, 'productStats', { on: { id: 'store' } })
              .sort('productStats.productCount desc');

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" LEFT JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store" ORDER BY "productStats"."productCount" DESC',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });
        });

        describe('subquery distinctOn', () => {
          it('should support distinctOn in subquery join', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const latestProducts = subquery(ProductRepository).select(['store', 'name']).distinctOn(['store']).sort('store');

            const result = await StoreRepository.find({}).join(latestProducts, 'latestProduct', { on: { id: 'store' } });

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" INNER JOIN (SELECT DISTINCT ON ("store_id") "store_id" AS "store","name" FROM "products" ORDER BY "store_id") AS "latestProduct" ON "stores"."id"="latestProduct"."store"',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });

          it('should support distinctOn with where clause in subquery join', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            const latestProducts = subquery(ProductRepository)
              .select(['store', 'name'])
              .where({ name: { '!': null } })
              .distinctOn(['store'])
              .sort('store');

            const result = await StoreRepository.find({}).leftJoin(latestProducts, 'latestProduct', { on: { id: 'store' } });

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" LEFT JOIN (SELECT DISTINCT ON ("store_id") "store_id" AS "store","name" FROM "products" WHERE "name" IS NOT NULL ORDER BY "store_id") AS "latestProduct" ON "stores"."id"="latestProduct"."store"',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });

          it('should support distinctOn with secondary sort in subquery', async () => {
            const stores = [generateStore()];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

            // Get the latest product per store (sorted by name desc as secondary sort)
            const latestProducts = subquery(ProductRepository)
              .select(['store', 'name'])
              .distinctOn(['store'])
              .sort('store, name desc' as 'store');

            const result = await StoreRepository.find({}).join(latestProducts, 'latestProduct', { on: { id: 'store' } });

            assert(result);
            expect(result).toStrictEqual(stores);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name" FROM "stores" INNER JOIN (SELECT DISTINCT ON ("store_id") "store_id" AS "store","name" FROM "products" ORDER BY "store_id","name" DESC) AS "latestProduct" ON "stores"."id"="latestProduct"."store"',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });

          it('should support distinctOn in WHERE IN subquery', async () => {
            const testStore = generateStore();
            const products = [generateProduct({ store: testStore.id })];

            mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

            const distinctStores = subquery(ProductRepository).select(['store']).distinctOn(['store']).sort('store');

            const result = await ProductRepository.find({}).where({
              store: { in: distinctStores },
            });

            assert(result);
            expect(result).toStrictEqual(products);

            const [query, params] = mockedPool.query.mock.calls[0]!;
            expect(query).toBe(
              'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id" IN (SELECT DISTINCT ON ("store_id") "store_id" FROM "products" ORDER BY "store_id")',
            );
            assert(params);
            expect(params).toStrictEqual([]);
          });
        });
      });
    });

    describe('populate', () => {
      let store1: StoreSelect;
      let store2: StoreSelect;
      let product1: ProductSelect;
      let product2: ProductSelect;
      let product3: ProductSelect;
      let category1: CategorySelect;
      let category2: CategorySelect;
      let product1Category1: ProductCategorySelect;
      let product1Category2: ProductCategorySelect;
      let product2Category1: ProductCategorySelect;
      let product3Category1: ProductCategorySelect;

      let teacher1: TeacherSelect;
      let teacher2: TeacherSelect;
      let parkingLot: ParkingLotSelect;
      let parkingSpace: ParkingSpaceSelect;
      let classroom: ClassroomSelect;
      let teacher1Classroom: TeacherClassroomSelect;

      let source1: SimpleWithSelfReferenceSelect;
      let source2: SimpleWithSelfReferenceSelect;
      let translation1: SimpleWithSelfReferenceSelect;
      let translation2: SimpleWithSelfReferenceSelect;

      let levelOneItem: LevelOneSelect;
      let levelTwoItem: LevelTwoSelect;
      let levelThreeItem: LevelThreeSelect;

      beforeAll(() => {
        store1 = generateStore();
        store2 = generateStore();

        product1 = generateProduct({
          store: store1.id,
        });
        product2 = generateProduct({
          store: store2.id,
        });
        product3 = generateProduct({
          store: store1.id,
        });

        category1 = generateCategory();
        category2 = generateCategory();

        product1Category1 = generateProductCategory(product1.id, category1.id);
        product1Category2 = generateProductCategory(product1.id, category2.id);
        product2Category1 = generateProductCategory(product2, category1);
        product3Category1 = generateProductCategory(product3, category1);

        parkingLot = generateParkingLot();
        parkingSpace = generateParkingSpace({
          parkingLot: parkingLot.id,
        });

        teacher1 = generateTeacher({
          parkingSpace: parkingSpace.id,
        });
        teacher2 = generateTeacher();

        classroom = generateClassroom();

        teacher1Classroom = generateTeacherClassroom(teacher1, classroom);

        source1 = generateSimpleWithSelfReference();
        source2 = generateSimpleWithSelfReference();

        translation1 = generateSimpleWithSelfReference({
          source: source1.id,
        });
        translation2 = generateSimpleWithSelfReference({
          source: source1.id,
        });

        levelThreeItem = generateLevelThree();
        levelTwoItem = generateLevelTwo({
          levelThree: levelThreeItem.id,
        });
        levelOneItem = generateLevelOne({
          levelTwo: levelTwoItem.id,
        });
      });

      it('should support populating a single relation - same/shared', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1, product3])).mockResolvedValueOnce(getQueryResult([store1]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('store');
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([store1.id]);
      });

      it('should support populating a single relation - different', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1, product2])).mockResolvedValueOnce(
          getQueryResult([
            // NOTE: Swapping the order to make sure that order doesn't matter
            store2,
            store1,
          ]),
        );

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('store');
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1,
          },
          {
            ...product2,
            store: store2,
          },
        ]);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating a single relation with implicit inherited pool override', async () => {
        const poolOverride = createMockPool();

        poolOverride.query.mockResolvedValueOnce(getQueryResult([product1, product3])).mockResolvedValueOnce(getQueryResult([store1]));

        const results = await ProductRepository.find({
          pool: poolOverride,
          // @ts-expect-error -- populate type constraint pending Entity migration
        }).populate('store');

        expect(mockedPool.query).not.toHaveBeenCalled();
        expect(poolOverride.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = poolOverride.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = poolOverride.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([store1.id]);
      });

      it('should support populating a single relation with explicit pool override', async () => {
        const storePool = createMockPool();

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1, product3]));
        storePool.query.mockResolvedValueOnce(getQueryResult([store1]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('store', {
          pool: storePool,
        });

        expect(mockedPool.query).toHaveBeenCalledOnce();
        expect(storePool.query).toHaveBeenCalledOnce();
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = storePool.query.mock.calls[0]!;
        expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([store1.id]);
      });

      it('should support populating a single relation as QueryResult with partial select', async () => {
        const levelOneResult = pick(levelOneItem, 'id', 'one', 'levelTwo');
        const levelTwoResult = pick(levelTwoItem, 'id', 'two', 'levelThree');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([levelOneResult])).mockResolvedValueOnce(getQueryResult([levelTwoResult]));

        const results = await LevelOneRepository.find({
          select: ['one', 'levelTwo'],
          // @ts-expect-error -- populate type constraint pending Entity migration
        }).populate('levelTwo', {
          select: ['two', 'levelThree'],
        });
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...levelOneResult,
            levelTwo: levelTwoResult,
          },
        ]);

        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.levelTwo.levelThree).toBe(levelThreeItem.id);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.levelTwo.levelThree.toUpperCase()).toBe(levelThreeItem.id.toUpperCase());
      });

      it('should support populating a single relation as QueryResult with partial select from chained select', async () => {
        const levelOneResult = pick(levelOneItem, 'id', 'one', 'levelTwo');
        const levelTwoResult = pick(levelTwoItem, 'id', 'two', 'levelThree');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([levelOneResult])).mockResolvedValueOnce(getQueryResult([levelTwoResult]));

        const results = await LevelOneRepository.find({})
          .select(['one', 'levelTwo'])
          // @ts-expect-error -- populate type constraint pending Entity migration
          .populate('levelTwo', {
            select: ['two', 'levelThree'],
          });
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...levelOneResult,
            levelTwo: levelTwoResult,
          },
        ]);

        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.levelTwo.levelThree).toBe(levelThreeItem.id);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.levelTwo.levelThree.toUpperCase()).toBe(levelThreeItem.id.toUpperCase());
      });

      it('should support populating a single relation with partial select and sort', async () => {
        const store1Result = pick(store1, 'id');
        const store2Result = pick(store2, 'id');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1, product2])).mockResolvedValueOnce(getQueryResult([store1Result, store2Result]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('store', {
          select: ['id'],
          sort: 'name',
        });
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1Result,
          },
          {
            ...product2,
            store: store2Result,
          },
        ]);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id" FROM "stores" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating a single relation when column is missing from partial select', async () => {
        const product1Result = pick(product1, 'id', 'name', 'store');
        const product2Result = pick(product2, 'id', 'name', 'store');
        const store1Result = pick(store1, 'id');
        const store2Result = pick(store2, 'id');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1Result, product2Result])).mockResolvedValueOnce(getQueryResult([store1Result, store2Result]));

        const results = await ProductRepository.find({
          select: ['name'],
          // @ts-expect-error -- populate type constraint pending Entity migration
        }).populate('store', {
          select: ['id'],
        });
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1Result,
            store: store1Result,
          },
          {
            ...product2Result,
            store: store2Result,
          },
        ]);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "name","store_id" AS "store","id" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating one-to-many collection', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([store1, store2])).mockResolvedValueOnce(getQueryResult([product1, product3, product2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await StoreRepository.find({}).populate('products');
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products[0]!.id).toBe(product1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating one-to-many collection with implicit inherited pool override', async () => {
        const poolOverride = createMockPool();

        poolOverride.query.mockResolvedValueOnce(getQueryResult([store1, store2])).mockResolvedValueOnce(getQueryResult([product1, product3, product2]));

        const results = await StoreRepository.find({
          pool: poolOverride,
          // @ts-expect-error -- populate type constraint pending Entity migration
        }).populate('products');

        expect(mockedPool.query).not.toHaveBeenCalled();
        expect(poolOverride.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products[0]!.id).toBe(product1.id);

        const [productQuery, productQueryParams] = poolOverride.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = poolOverride.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating one-to-many collection with explicit pool override', async () => {
        const productPool = createMockPool();

        mockedPool.query.mockResolvedValueOnce(getQueryResult([store1, store2]));
        productPool.query.mockResolvedValueOnce(getQueryResult([product1, product3, product2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await StoreRepository.find({}).populate('products', {
          pool: productPool,
        });
        expect(mockedPool.query).toHaveBeenCalledOnce();
        expect(productPool.query).toHaveBeenCalledOnce();
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products[0]!.id).toBe(product1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = productPool.query.mock.calls[0]!;
        expect(storeQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating one-to-many collection with partial select and sort', async () => {
        const product1Result = pick(product1, 'id', 'name', 'sku', 'store');
        const product2Result = pick(product2, 'id', 'name', 'sku', 'store');
        const product3Result = pick(product3, 'id', 'name', 'sku', 'store');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([store1, store2])).mockResolvedValueOnce(getQueryResult([product1Result, product3Result, product2Result]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await StoreRepository.find({}).populate('products', {
          select: ['name', 'sku', 'store'],
          sort: 'name',
        });
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...store1,
            products: [product1Result, product3Result],
          },
          {
            ...store2,
            products: [product2Result],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.products[0]!.id).toBe(product1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "name","sku","store_id" AS "store","id" FROM "products" WHERE "store_id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
      });

      it('should support populating multi-multi collection', async () => {
        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product1, product3, product2]))
          .mockResolvedValueOnce(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('categories');
        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            categories: [category1, category2],
          },
          {
            ...product3,
            categories: [category1],
          },
          {
            ...product2,
            categories: [category1],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories[0]!.id).toBe(category1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [productCategoryQuery, productCategoryQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        expect(productCategoryQueryParams).toStrictEqual([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
      });

      it('should support populating multi-multi collection with implicit inherited pool override', async () => {
        const poolOverride = createMockPool();
        poolOverride.query
          .mockResolvedValueOnce(getQueryResult([product1, product3, product2]))
          .mockResolvedValueOnce(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        const results = await ProductRepository.find({
          pool: poolOverride,
          // @ts-expect-error -- populate type constraint pending Entity migration
        }).populate('categories');

        expect(mockedPool.query).not.toHaveBeenCalled();
        expect(poolOverride.query).toHaveBeenCalledTimes(3);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            categories: [category1, category2],
          },
          {
            ...product3,
            categories: [category1],
          },
          {
            ...product2,
            categories: [category1],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories[0]!.id).toBe(category1.id);

        const [productQuery, productQueryParams] = poolOverride.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [productCategoryQuery, productCategoryQueryParams] = poolOverride.query.mock.calls[1]!;
        expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        expect(productCategoryQueryParams).toStrictEqual([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = poolOverride.query.mock.calls[2]!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
      });

      it('should support populating multi-multi collection with explicit pool override', async () => {
        const productPool = createMockPool();
        mockedPool.query.mockResolvedValueOnce(getQueryResult([product1, product3, product2]));
        productPool.query
          .mockResolvedValueOnce(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('categories', {
          pool: productPool,
        });

        expect(mockedPool.query).toHaveBeenCalledOnce();
        expect(productPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            categories: [category1, category2],
          },
          {
            ...product3,
            categories: [category1],
          },
          {
            ...product2,
            categories: [category1],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories[0]!.id).toBe(category1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [productCategoryQuery, productCategoryQueryParams] = productPool.query.mock.calls[0]!;
        expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        expect(productCategoryQueryParams).toStrictEqual([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = productPool.query.mock.calls[1]!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
      });

      it('should support populating multi-multi collection with partial select and sort', async () => {
        const category1Result = pick(category1, 'id');
        const category2Result = pick(category2, 'id');

        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product1, product3, product2]))
          .mockResolvedValueOnce(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .mockResolvedValueOnce(getQueryResult([category1Result, category2Result]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('categories', {
          select: ['id'],
          sort: 'name',
        });
        expect(mockedPool.query).toHaveBeenCalledTimes(3);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            categories: [category1Result, category2Result],
          },
          {
            ...product3,
            categories: [category1Result],
          },
          {
            ...product2,
            categories: [category1Result],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories[0]!.id).toBe(category1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [productCategoryQuery, productCategoryQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        expect(productCategoryQueryParams).toStrictEqual([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(categoryQuery).toBe('SELECT "id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);
      });

      it('should support populating multiple properties', async () => {
        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([product1, product3, product2]))
          .mockResolvedValueOnce(
            getQueryResult([
              // NOTE: Swapping the order to make sure that order doesn't matter
              store2,
              store1,
            ]),
          )
          .mockResolvedValueOnce(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .mockResolvedValueOnce(getQueryResult([category1, category2]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const results = await ProductRepository.find({}).populate('store').populate('categories');
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...product1,
            store: store1,
            categories: [category1, category2],
          },
          {
            ...product3,
            store: store1,
            categories: [category1],
          },
          {
            ...product2,
            store: store2,
            categories: [category1],
          },
        ]);
        expect(mockedPool.query).toHaveBeenCalledTimes(4);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.store.id).toBe(store1.id);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.categories[0]!.id).toBe(category1.id);

        const [productQuery, productQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(productQuery).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        expect(productQueryParams).toStrictEqual([]);
        const [storeQuery, storeQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(storeQuery).toBe('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        expect(storeQueryParams).toStrictEqual([[store1.id, store2.id]]);
        const [productCategoryQuery, productCategoryQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        expect(productCategoryQueryParams).toStrictEqual([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.lastCall!;
        expect(categoryQuery).toBe('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([[category1.id, category2.id]]);

        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.store.id).toBe(store1.id);
      });

      it('should support populating multiple properties with partial select and sort', async () => {
        const parkingSpaceResult = pick(parkingSpace, 'id', 'name');
        const classroomResult = pick(classroom, 'id', 'name');

        mockedPool.query
          .mockResolvedValueOnce(getQueryResult([teacher1, teacher2]))
          .mockResolvedValueOnce(getQueryResult([parkingSpaceResult]))
          .mockResolvedValueOnce(getQueryResult([teacher1Classroom]))
          .mockResolvedValueOnce(getQueryResult([classroomResult]));

        async function getTeachers(): Promise<
          (Omit<TeacherSelect, 'parkingSpace'> & {
            parkingSpace: Pick<ParkingSpaceSelect, 'id' | 'name'> | null;
            classrooms: Pick<ClassroomSelect, 'id' | 'name'>[];
          })[]
        > {
          // @ts-expect-error -- Populated type mismatch with inferred schemas
          return (
            TeacherRepository.find({})
              .where({
                isActive: true,
              })
              .sort('lastName')
              // @ts-expect-error -- populate type constraint pending Entity migration
              .populate('parkingSpace', {
                select: ['name'],
              })
              // @ts-expect-error -- populate type constraint pending Entity migration
              .populate('classrooms', {
                select: ['name'],
                where: {
                  name: {
                    like: 'classroom%',
                  },
                },
              })
          );
        }

        const results = await getTeachers();
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...teacher1,
            parkingSpace: parkingSpaceResult,
            classrooms: [classroomResult],
          },
          {
            ...teacher2,
            parkingSpace: undefined,
            classrooms: [],
          },
        ]);
        expect(mockedPool.query).toHaveBeenCalledTimes(4);
        expect(results[0]!.parkingSpace?.id).toBe(parkingSpace.id);
        expect(results[0]!.classrooms.length).toBe(1);
        expect(results[0]!.classrooms[0]!.id).toBe(classroom.id);

        const [teacherQuery, teacherQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(teacherQuery).toBe(
          'SELECT "id","first_name" AS "firstName","last_name" AS "lastName","parking_space_id" AS "parkingSpace","is_active" AS "isActive" FROM "teacher" WHERE "is_active"=$1 ORDER BY "last_name"',
        );
        assert(teacherQueryParams);
        expect(teacherQueryParams).toStrictEqual([true]);
        const [parkingSpaceQuery, parkingSpaceQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(parkingSpaceQuery).toBe('SELECT "name","id" FROM "parking_space" WHERE "id"=ANY($1::TEXT[])');
        assert(parkingSpaceQueryParams);
        // Both teachers' parking space IDs are collected for the populate query
        expect(parkingSpaceQueryParams).toStrictEqual([[teacher1.parkingSpace, teacher2.parkingSpace]]);
        const [teacherClassroomQuery, teacherClassroomQueryParams] = mockedPool.query.mock.calls[2]!;
        expect(teacherClassroomQuery).toBe('SELECT "teacher_id" AS "teacher","classroom_id" AS "classroom","id" FROM "teacher__classroom" WHERE "teacher_id"=ANY($1::TEXT[])');
        assert(teacherClassroomQueryParams);
        expect(teacherClassroomQueryParams).toStrictEqual([[teacher1.id, teacher2.id]]);
        const [categoryQuery, categoryQueryParams] = mockedPool.query.mock.lastCall!;
        expect(categoryQuery).toBe('SELECT "name","id" FROM "classroom" WHERE "id"=$1 AND "name" ILIKE $2');
        assert(categoryQueryParams);
        expect(categoryQueryParams).toStrictEqual([classroom.id, 'classroom%']);
      });

      it('should support populating self reference', async () => {
        const source1Result = pick(source1, 'id', 'name');
        const source2Result = pick(source2, 'id', 'name');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([source1Result, source2Result])).mockResolvedValueOnce(getQueryResult([translation1, translation2]));

        const results = await SimpleWithSelfReferenceRepository.find({
          select: ['name'],
        })
          .where({
            source: null,
          })
          // @ts-expect-error -- populate type constraint pending Entity migration
          .populate('translations');
        expect(mockedPool.query).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual([
          {
            ...source1Result,
            translations: [translation1, translation2],
          },
          {
            ...source2Result,
            translations: [],
          },
        ]);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.translations.length).toBe(2);
        // @ts-expect-error -- populated property type pending Entity migration
        expect(results[0]!.translations[0]!.id).toBe(translation1.id);

        const [sourceQuery, sourceQueryParams] = mockedPool.query.mock.calls[0]!;
        expect(sourceQuery).toBe('SELECT "name","id" FROM "simple" WHERE "source_id" IS NULL');
        assert(sourceQueryParams);
        expect(sourceQueryParams).toStrictEqual([]);
        const [translationsQuery, translationsQueryParams] = mockedPool.query.mock.calls[1]!;
        expect(translationsQuery).toBe('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=ANY($1::TEXT[])');
        assert(translationsQueryParams);
        expect(translationsQueryParams).toStrictEqual([[source1.id, source2.id]]);
      });

      describe('through options', () => {
        it('should filter by junction table columns with through.where for multiple entities', async () => {
          const product1Category1MapPrimary = {
            ...product1Category1,
            isPrimary: true,
          };
          // product1Category2 is not returned from the junction query due to isPrimary filter
          const product2Category1MapPrimary = {
            ...product2Category1,
            isPrimary: true,
          };

          mockedPool.query
            .mockResolvedValueOnce(getQueryResult([product1, product2]))
            .mockResolvedValueOnce(getQueryResult([product1Category1MapPrimary, product2Category1MapPrimary])) // Only primary mappings
            .mockResolvedValueOnce(getQueryResult([category1]));

          // @ts-expect-error -- populate type constraint pending Entity migration
          const results = await ProductRepository.find({}).populate('categories', {
            through: {
              where: { isPrimary: true },
            },
          });

          expect(mockedPool.query).toHaveBeenCalledTimes(3);
          // eslint-disable-next-line vitest-js/prefer-strict-equal
          expect(results).toEqual([
            {
              ...product1,
              categories: [category1],
            },
            {
              ...product2,
              categories: [category1],
            },
          ]);

          const [productCategoryQuery, productCategoryQueryParams] = mockedPool.query.mock.calls[1]!;
          expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[]) AND "is_primary"=$2');
          assert(productCategoryQueryParams);
          expect(productCategoryQueryParams).toStrictEqual([[product1.id, product2.id], true]);
        });

        it('should order by junction table columns with through.sort for multiple entities', async () => {
          const product1Category1MapOrdering2 = {
            ...product1Category1,
            ordering: 2,
          };
          const product1Category2MapOrdering1 = {
            ...product1Category2,
            ordering: 1,
          };

          // Junction query returns in ordering order
          mockedPool.query
            .mockResolvedValueOnce(getQueryResult([product1]))
            .mockResolvedValueOnce(getQueryResult([product1Category2MapOrdering1, product1Category1MapOrdering2]))
            .mockResolvedValueOnce(getQueryResult([category1, category2]));

          const results = await ProductRepository.find({})
            .where({ id: product1.id })
            // @ts-expect-error -- populate type constraint pending Entity migration
            .populate('categories', {
              through: {
                sort: 'ordering asc',
              },
            });

          expect(mockedPool.query).toHaveBeenCalledTimes(3);
          // Categories should be in junction order: category2 (ordering=1) before category1 (ordering=2)
          // @ts-expect-error -- populated property type pending Entity migration
          expect(results[0]!.categories[0]!.id).toBe(category2.id);
          // @ts-expect-error -- populated property type pending Entity migration
          expect(results[0]!.categories[1]!.id).toBe(category1.id);

          const [productCategoryQuery, productCategoryQueryParams] = mockedPool.query.mock.calls[1]!;
          expect(productCategoryQuery).toBe('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1 ORDER BY "ordering"');
          assert(productCategoryQueryParams);
          expect(productCategoryQueryParams).toStrictEqual([product1.id]);
        });

        it('should preserve per-entity ordering when using through.sort with multiple entities', async () => {
          // Product1: categories in order [category2, category1]
          // Product2: categories in order [category1] only
          const product1Category1MapOrdering2 = {
            ...product1Category1,
            ordering: 2,
          };
          const product1Category2MapOrdering1 = {
            ...product1Category2,
            ordering: 1,
          };
          const product2Category1MapOrdering1 = {
            ...product2Category1,
            ordering: 1,
          };

          mockedPool.query
            .mockResolvedValueOnce(getQueryResult([product1, product2]))
            .mockResolvedValueOnce(getQueryResult([product1Category2MapOrdering1, product1Category1MapOrdering2, product2Category1MapOrdering1]))
            .mockResolvedValueOnce(getQueryResult([category1, category2]));

          const results = await ProductRepository.find({})
            .where({ id: [product1.id, product2.id] })
            // @ts-expect-error -- populate type constraint pending Entity migration
            .populate('categories', {
              through: {
                sort: 'ordering asc',
              },
            });

          expect(mockedPool.query).toHaveBeenCalledTimes(3);
          // Product1: category2 first (ordering=1), then category1 (ordering=2)
          // @ts-expect-error -- populated property type pending Entity migration
          expect(results[0]!.categories[0]!.id).toBe(category2.id);
          // @ts-expect-error -- populated property type pending Entity migration
          expect(results[0]!.categories[1]!.id).toBe(category1.id);
          // Product2: only category1
          // @ts-expect-error -- populated property type pending Entity migration
          expect(results[1]!.categories[0]!.id).toBe(category1.id);
        });
      });

      it('should throw when attempting to populate collection and not not explicitly specifying relation column', async () => {
        const source1Result = pick(source1, 'id', 'name');
        const source2Result = pick(source2, 'id', 'name');
        const translation1Result = pick(translation1, 'id', 'name', 'source');
        const translation2Result = pick(translation2, 'id', 'name', 'source');

        mockedPool.query.mockResolvedValueOnce(getQueryResult([source1Result, source2Result])).mockResolvedValueOnce(getQueryResult([translation1Result, translation2Result]));

        await expect(
          SimpleWithSelfReferenceRepository.find({
            select: ['name'],
          })
            .where({
              source: null,
            })
            // @ts-expect-error -- populate type constraint pending Entity migration
            .populate('translations', {
              select: ['id', 'name'],
            }),
        ).rejects.toThrow('Unable to populate "translations" on SimpleWithSelfReference. "source" is not included in select array.');
      });
    });

    describe('withCount()', () => {
      it('should return results and totalCount', async () => {
        const products = [
          { ...generateProduct({ store: store.id }), __total_count__: '42' },
          { ...generateProduct({ store: store.id }), __total_count__: '42' },
        ];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).withCount();

        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('totalCount');
        expect(result.results).toHaveLength(2);
        expect(result.totalCount).toBe(42);
        expect(result.results[0]!).not.toHaveProperty('__total_count__');

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store",count(*) OVER() AS "__total_count__" FROM "products"');
        assert(params);
        expect(params).toStrictEqual([]);
      });

      it('should work with where clause and pagination', async () => {
        const products = [{ ...generateProduct({ store: store.id }), __total_count__: '100' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).where({ store: store.id }).skip(10).limit(20).withCount();

        expect(result.results).toHaveLength(1);
        expect(result.totalCount).toBe(100);

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store",count(*) OVER() AS "__total_count__" FROM "products" WHERE "store_id"=$1 LIMIT 20 OFFSET 10',
        );
        assert(params);
        expect(params).toStrictEqual([store.id]);
      });

      it('should work with joins', async () => {
        const products = [{ ...generateProduct({ store: store.id }), __total_count__: '5' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({})
          .join('store')
          .where({
            store: {
              // @ts-expect-error -- joined table filter not typed for inferred schemas
              name: 'Test',
            },
          })
          .withCount();

        expect(result.results).toHaveLength(1);
        expect(result.totalCount).toBe(5);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store",count(*) OVER() AS "__total_count__" FROM "products" INNER JOIN "stores" AS "store" ON "products"."store_id"="store"."id" WHERE "store"."name"=$1',
        );
      });

      it('should return 0 totalCount when no results', async () => {
        mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

        const result = await ProductRepository.find({}).where({ store: store.id }).withCount();

        expect(result.results).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });

      it('should support chaining withCount before other methods', async () => {
        const products = [{ ...generateProduct({ store: store.id }), __total_count__: '50' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).withCount().where({ store: store.id }).sort('name').limit(10);

        expect(result.totalCount).toBe(50);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe(
          'SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store",count(*) OVER() AS "__total_count__" FROM "products" WHERE "store_id"=$1 ORDER BY "name" LIMIT 10',
        );
      });

      it('should work with select', async () => {
        const products = [{ id: 1, name: 'Test', __total_count__: '25' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).select(['name']).withCount();

        expect(result.totalCount).toBe(25);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "name","id",count(*) OVER() AS "__total_count__" FROM "products"');
      });

      it('should work with populate', async () => {
        const product = { ...generateProduct({ store: store.id }), __total_count__: '10' };

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.find({}).populate('store').withCount();

        expect(result.totalCount).toBe(10);
        expect(result.results[0]!.store).toStrictEqual(store);
      });

      it('should work with paginate helper', async () => {
        const products = [{ ...generateProduct({ store: store.id }), __total_count__: '200' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).withCount().paginate({ page: 3, limit: 25 });

        expect(result.totalCount).toBe(200);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store",count(*) OVER() AS "__total_count__" FROM "products" LIMIT 25 OFFSET 50');
      });
    });

    describe('toJSON()', () => {
      it('should return plain objects without prototype chain', async () => {
        const products = [generateProduct({ store: store.id }), generateProduct({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({});

        expect(result).toHaveLength(2);
        // Verify results are plain objects (no prototype chain from Product class)
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result[1]!)).toBe(Object.prototype);
      });

      it('should work with where clause', async () => {
        const products = [generateProduct({ store: store.id })];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).where({ store: store.id });

        expect(result).toHaveLength(1);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should work with select', async () => {
        const products = [{ id: 1, name: 'Test' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).select(['name']);

        expect(result).toHaveLength(1);
        expect(result[0]!).toHaveProperty('name', 'Test');
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should cascade to populated entities', async () => {
        const product = generateProduct({ store: store.id });

        mockedPool.query.mockResolvedValueOnce(getQueryResult([product])).mockResolvedValueOnce(getQueryResult([store]));

        // @ts-expect-error -- populate type constraint pending Entity migration
        const result = await ProductRepository.find({}).populate('store');

        expect(result).toHaveLength(1);
        // Both the product and the populated store should be plain objects
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(result[0]!.store)).toBe(Object.prototype);
      });

      it('should work with withCount', async () => {
        const products = [{ ...generateProduct({ store: store.id }), __total_count__: '42' }];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).withCount();

        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('totalCount');
        expect(result.totalCount).toBe(42);
        expect(Object.getPrototypeOf(result.results[0]!)).toBe(Object.prototype);
      });

      it('should return array (not paginated object) with subquery join', async () => {
        const stores = [generateStore(), generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const productCounts = subquery(ProductRepository)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = await StoreRepository.find({}).join(productCounts, 'stats', { on: { id: 'store' } });

        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual(stores);
        expect(Array.isArray(result)).toBe(true);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should return array with left join to subquery', async () => {
        const stores = [generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const productCounts = subquery(ProductRepository)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = await StoreRepository.find({}).leftJoin(productCounts, 'stats', { on: { id: 'store' } });

        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(result).toEqual(stores);
        expect(Array.isArray(result)).toBe(true);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });
    });

    describe('distinctOn()', () => {
      it('should support distinctOn with sort', async () => {
        const products = [generateProduct({ store: store.id })];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).distinctOn(['store']).sort('store');

        expect(result).toStrictEqual(products);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id"');
      });

      it('should support distinctOn with multiple columns', async () => {
        const products = [generateProduct({ store: store.id })];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const result = await ProductRepository.find({}).distinctOn(['store', 'name']).sort({ store: 'asc', name: 'desc' });

        expect(result).toStrictEqual(products);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT DISTINCT ON ("store_id","name") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id","name" DESC');
      });

      it('should work with where clause', async () => {
        const products = [generateProduct({ store: store.id })];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        await ProductRepository.find({})
          .where({ name: { startsWith: 'Test' } })
          .distinctOn(['store'])
          .sort('store');

        const [query, params] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "name" ILIKE $1 ORDER BY "store_id"');
        assert(params);
        expect(params).toStrictEqual(['Test%']);
      });

      it('should work with select', async () => {
        const products = [{ id: 1, name: 'Test', store: store.id }];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        await ProductRepository.find({}).select(['name', 'store']).distinctOn(['store']).sort('store');

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT DISTINCT ON ("store_id") "name","store_id" AS "store","id" FROM "products" ORDER BY "store_id"');
      });

      it('should work with limit', async () => {
        const products = [generateProduct({ store: store.id })];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        await ProductRepository.find({}).distinctOn(['store']).sort('store').limit(10);

        const [query] = mockedPool.query.mock.calls[0]!;
        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id" LIMIT 10');
      });

      it('should work with toJSON', async () => {
        const products = [generateProduct({ store: store.id })];
        mockedPool.query.mockResolvedValueOnce(getQueryResult(products));

        const results = await ProductRepository.find({}).distinctOn(['store']).sort('store');

        // eslint-disable-next-line vitest-js/prefer-strict-equal
        expect(results).toEqual(products);
        expect(Object.getPrototypeOf(results[0]!)).toBe(Object.prototype);
      });

      it('should throw if distinctOn is used with withCount', async () => {
        let thrownError: Error | undefined;

        try {
          await ProductRepository.find({}).distinctOn(['store']).sort('store').withCount();
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('distinctOn cannot be used with withCount');
      });

      it('should throw if ORDER BY is missing', async () => {
        let thrownError: Error | undefined;

        try {
          await ProductRepository.find({}).distinctOn(['store']);
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('DISTINCT ON requires ORDER BY');
      });

      it('should throw if ORDER BY columns do not match DISTINCT ON columns', async () => {
        let thrownError: Error | undefined;

        try {
          await ProductRepository.find({}).distinctOn(['store']).sort('name');
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('DISTINCT ON columns must match');
      });

      it('should return array (not paginated object) with subquery join', async () => {
        const stores = [generateStore(), generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const productCounts = subquery(ProductRepository)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = await StoreRepository.find({}).join(productCounts, 'stats', { on: { id: 'store' } });

        // eslint-disable-next-line vitest-js/prefer-strict-equal -- comparing across prototype boundaries
        expect(result).toEqual(stores);
        expect(Array.isArray(result)).toBe(true);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });

      it('should return array with left join to subquery', async () => {
        const stores = [generateStore()];

        mockedPool.query.mockResolvedValueOnce(getQueryResult(stores));

        const productCounts = subquery(ProductRepository)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = await StoreRepository.find({}).leftJoin(productCounts, 'stats', { on: { id: 'store' } });

        // eslint-disable-next-line vitest-js/prefer-strict-equal -- comparing across prototype boundaries
        expect(result).toEqual(stores);
        expect(Array.isArray(result)).toBe(true);
        expect(Object.getPrototypeOf(result[0]!)).toBe(Object.prototype);
      });
    });
  });

  describe('#count()', () => {
    let store: StoreSelect;

    beforeEach(() => {
      store = generateStore();
    });

    it('should support call without constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count();
      assert(result);
      expect(result).toBe(products.length);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products"');
      assert(params);
      expect(params).toStrictEqual([]);
    });

    it('should support call with explicit pool override', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      const poolOverride = createMockPool();

      poolOverride.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        pool: poolOverride,
      });
      assert(result);
      expect(result).toStrictEqual(products.length);

      expect(mockedPool.query).not.toHaveBeenCalled();
      const [query, params] = poolOverride.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products"');
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

      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        id: products.map((item) => item.id),
        store: store.id,
      });
      assert(result);
      expect(result).toBe(products.length);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      expect(params).toStrictEqual([products.map((item) => item.id), store.id]);
    });

    it('should support call with chained where constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count().where({
        store: store.id,
      });
      assert(result);
      expect(result).toBe(products.length);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with explicit pool override and chained where constraints', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      const poolOverride = createMockPool();

      poolOverride.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        pool: poolOverride,
      }).where({
        store: store.id,
      });
      assert(result);
      expect(result).toBe(products.length);

      expect(mockedPool.query).not.toHaveBeenCalled();
      const [query, params] = poolOverride.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });

    it('should support call with chained where constraints - Promise.all', async () => {
      const products = [
        generateProduct({
          store: store.id,
        }),
        generateProduct({
          store: store.id,
        }),
      ];

      mockedPool.query.mockResolvedValueOnce(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const [result] = await Promise.all([
        ProductRepository.count().where({
          store: store.id,
        }),
      ]);
      assert(result);
      expect(result).toBe(products.length);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      expect(params).toStrictEqual([store.id]);
    });
  });
});
