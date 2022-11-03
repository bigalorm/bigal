import assert from 'assert';

import { faker } from '@faker-js/faker';
import chai from 'chai';
import _ from 'lodash';
import type { QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import { Pool } from 'postgres-pool';
import { anyString, anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';

import type { Repository, ReadonlyRepository, QueryResult, QueryResultPopulated } from '../src';
import { initialize } from '../src';
import type { WhereQuery } from '../src/query';

import type { ParkingLot } from './models';
import {
  Category,
  Classroom,
  KitchenSink,
  LevelOne,
  LevelThree,
  LevelTwo,
  ParkingSpace,
  Product,
  ProductCategory,
  ReadonlyProduct,
  SimpleWithJson,
  SimpleWithOptionalEnum,
  SimpleWithRelationAndJson,
  SimpleWithSelfReference,
  SimpleWithStringCollection,
  SimpleWithUnion,
  Store,
  Teacher,
  TeacherClassroom,
} from './models';
import * as generator from './utils/generator';

function getQueryResult<T extends QueryResultRow>(rows: T[]): PgQueryResult<T> {
  return {
    command: 'select',
    rowCount: 1,
    oid: 1,
    fields: [],
    rows,
  };
}

describe('ReadonlyRepository', () => {
  let should: Chai.Should;
  const mockedPool: Pool = mock(Pool);
  /* eslint-disable @typescript-eslint/naming-convention */
  let LevelOneRepository: Repository<LevelOne>;
  let LevelTwoRepository: Repository<LevelTwo>;
  let LevelThreeRepository: Repository<LevelThree>;
  let ProductRepository: Repository<Product>;
  let ReadonlyProductRepository: ReadonlyRepository<ReadonlyProduct>;
  let ReadonlyKitchenSinkRepository: ReadonlyRepository<KitchenSink>;
  let StoreRepository: Repository<Store>;
  let SimpleWithJsonRepository: Repository<SimpleWithJson>;
  let SimpleWithOptionalEnumRepository: Repository<SimpleWithOptionalEnum>;
  let SimpleWithRelationAndJsonRepository: Repository<SimpleWithRelationAndJson>;
  let SimpleWithSelfReferenceRepository: Repository<SimpleWithSelfReference>;
  let SimpleWithStringCollectionRepository: Repository<SimpleWithStringCollection>;
  let SimpleWithUnionRepository: Repository<SimpleWithUnion>;
  let TeacherRepository: Repository<Teacher>;
  /* eslint-enable @typescript-eslint/naming-convention */

  before(() => {
    should = chai.should();

    const repositoriesByModelName = initialize({
      models: [
        Classroom, //
        Category,
        KitchenSink,
        LevelOne,
        LevelTwo,
        LevelThree,
        ParkingSpace,
        Product,
        ProductCategory,
        ReadonlyProduct,
        SimpleWithJson,
        SimpleWithOptionalEnum,
        SimpleWithRelationAndJson,
        SimpleWithSelfReference,
        SimpleWithStringCollection,
        SimpleWithUnion,
        Store,
        Teacher,
        TeacherClassroom,
      ],
      pool: instance(mockedPool),
    });

    LevelOneRepository = repositoriesByModelName.LevelOne as Repository<LevelOne>;
    LevelTwoRepository = repositoriesByModelName.LevelTwo as Repository<LevelTwo>;
    LevelThreeRepository = repositoriesByModelName.LevelThree as Repository<LevelThree>;
    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ReadonlyProductRepository = repositoriesByModelName.ReadonlyProduct as ReadonlyRepository<ReadonlyProduct>;
    ReadonlyKitchenSinkRepository = repositoriesByModelName.KitchenSink as ReadonlyRepository<KitchenSink>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
    SimpleWithJsonRepository = repositoriesByModelName.SimpleWithJson as Repository<SimpleWithJson>;
    SimpleWithOptionalEnumRepository = repositoriesByModelName.SimpleWithOptionalEnum as Repository<SimpleWithOptionalEnum>;
    SimpleWithRelationAndJsonRepository = repositoriesByModelName.SimpleWithRelationAndJson as Repository<SimpleWithRelationAndJson>;
    SimpleWithSelfReferenceRepository = repositoriesByModelName.SimpleWithSelfReference as Repository<SimpleWithSelfReference>;
    SimpleWithStringCollectionRepository = repositoriesByModelName.SimpleWithStringCollection as Repository<SimpleWithStringCollection>;
    SimpleWithUnionRepository = repositoriesByModelName.SimpleWithUnion as Repository<SimpleWithUnion>;
    TeacherRepository = repositoriesByModelName.Teacher as Repository<Teacher>;
  });

  beforeEach(() => {
    reset(mockedPool);
  });

  describe('#findOne()', () => {
    let store: QueryResult<Store>;
    let product: QueryResult<Product>;
    beforeEach(() => {
      store = generator.store();
      product = generator.product({
        store: store.id,
      });
    });

    it('should support call without constraints', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      const result = await ReadonlyProductRepository.findOne();
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" LIMIT 1');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const productResult = _.pick(product, 'id', 'name');
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([productResult]));

      const result = await ProductRepository.findOne({
        select: ['name'],
        where: {
          id: product.id,
        },
        sort: 'name asc',
      });
      assert(result);
      result.should.deep.equal(productResult);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with sort as a parameter', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ReadonlyProductRepository.findOne({
        sort: 'name',
      });
      assert(result);
      result.should.deep.equal(product);
      result.name.should.equal(product.name);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" ORDER BY "name" LIMIT 1');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with where constraint as a parameter', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product.id,
      });
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter and querying id by entity value', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product,
      });
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter and querying property by entity value', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        store,
      });
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with explicit pool override', async () => {
      const poolOverride = mock(Pool);

      when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        pool: instance(poolOverride),
      }).where({
        id: product.id,
      });
      assert(result);
      result.should.deep.equal(product);

      verify(mockedPool.query(anyString(), anything())).never();
      const [query, params] = capture(poolOverride.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().where({
        id: product.id,
      });
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const [result] = await Promise.all([
        ProductRepository.findOne().where({
          id: product.id,
        }),
      ]);
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      assert(params);
      params.should.deep.equal([product.id]);
    });
    it('should support call with chained sort', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().sort('name asc');
      assert(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name" LIMIT 1');
      assert(params);
      params.should.deep.equal([]);
    });
    describe('Parse number columns', () => {
      it('should parse integer columns from integer query value', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              intColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);

        result.should.deep.equal({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should parse integer columns from float strings query value', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              intColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          intColumn: 42,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should parse integer columns that return as number', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              intColumn: numberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should ignore large integer columns values', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0`;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              intColumn: largeNumberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          intColumn: largeNumberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should parse float columns return as float strings', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              floatColumn: `${numberValue}`,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should parse float columns return as number', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              floatColumn: numberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
      it('should ignore large float columns', async () => {
        const id = faker.datatype.number();
        const name = faker.datatype.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0.42`;
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([
            {
              id,
              name,
              floatColumn: largeNumberValue,
            },
          ]),
        );

        const result = await ReadonlyKitchenSinkRepository.findOne();
        assert(result);
        result.should.deep.equal({
          id,
          name,
          floatColumn: largeNumberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        assert(params);
        params.should.deep.equal([]);
      });
    });
    it('should support populating a single relation', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([store]));

      const result = await ProductRepository.findOne().populate('store');
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating a single relation with implicit inherited pool override', async () => {
      const poolOverride = mock(Pool);

      when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([store]));

      const result = await ProductRepository.findOne({
        pool: instance(poolOverride),
      }).populate('store');

      verify(mockedPool.query(anyString(), anything())).never();
      verify(poolOverride.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = capture(poolOverride.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(poolOverride.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating a single relation with explicit pool override', async () => {
      const storePool = mock(Pool);

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      when(storePool.query(anyString(), anything())).thenResolve(getQueryResult([store]));

      const result = await ProductRepository.findOne().populate('store', {
        pool: instance(storePool),
      });
      verify(mockedPool.query(anyString(), anything())).once();
      verify(storePool.query(anyString(), anything())).once();
      assert(result);
      result.should.deep.equal({
        ...product,
        store,
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(storePool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating a single relation when column is missing from partial select', async () => {
      const productResult = _.pick(product, 'id', 'name', 'store');
      const storeResult = _.pick(store, 'id', 'name');
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([productResult]), getQueryResult([storeResult]));

      const result = await ProductRepository.findOne({
        select: ['name'],
      }).populate('store', {
        select: ['name'],
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...productResult,
        store: storeResult,
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "name","store_id" AS "store","id" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "name","id" FROM "stores" WHERE "id"=$1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating a single relation as QueryResult with partial select', async () => {
      const levelThreeItem = generator.levelThree();
      const levelTwoItem = generator.levelTwo({ levelThree: levelThreeItem.id });
      const levelOneItem = generator.levelOne({ levelTwo: levelTwoItem.id });

      const levelOneResult = _.pick(levelOneItem, 'id', 'one', 'levelTwo');
      const levelTwoResult = _.pick(levelTwoItem, 'id', 'two', 'levelThree');

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([levelOneResult]), getQueryResult([levelTwoResult]));

      const result = await LevelOneRepository.findOne({
        select: ['one', 'levelTwo'],
      }).populate('levelTwo', {
        select: ['two', 'levelThree'],
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...levelOneResult,
        levelTwo: levelTwoResult,
      });

      result.levelTwo.levelThree.should.equal(levelThreeItem.id);
      // Verify string functions are available - aka, that the type is not LevelThree | string.
      result.levelTwo.levelThree.toUpperCase().should.equal(levelThreeItem.id.toUpperCase());
    });
    it('should support populating a single relation with partial select and order', async () => {
      const storeResult = _.pick(store, 'id', 'name');
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([store]));

      const result = await ProductRepository.findOne().populate('store', {
        select: ['name'],
        sort: 'name',
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...product,
        store: storeResult,
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "name","id" FROM "stores" WHERE "id"=$1 ORDER BY "name"');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating collection', async () => {
      const product1 = generator.product({
        store: store.id,
      });
      const product2 = generator.product({
        store: store.id,
      });

      const storeWithProducts: QueryResultPopulated<Store, 'products'> = {
        ...store,
        products: [product1, product2],
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]), getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne().populate('products');
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal(storeWithProducts);
      result.products.length.should.equal(2);
      result.products[0].id.should.equal(product1.id);
      result.products[1].id.should.equal(product2.id);
      // Make sure QueryResultPopulated types look ok
      storeWithProducts.products.length.should.equal(2);
      storeWithProducts.products[0].id.should.equal(product1.id);
      storeWithProducts.products[1].id.should.equal(product2.id);

      const [storeQuery, storeQueryParams] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating collection with implicit inherited pool override', async () => {
      const poolOverride = mock(Pool);

      const product1 = generator.product({
        store: store.id,
      });
      const product2 = generator.product({
        store: store.id,
      });

      when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([store]), getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne({
        pool: instance(poolOverride),
      }).populate('products');

      verify(mockedPool.query(anyString(), anything())).never();
      verify(poolOverride.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...store,
        products: [product1, product2],
      });

      const [storeQuery, storeQueryParams] = capture(poolOverride.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(poolOverride.query).second();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating collection with explicit pool override', async () => {
      const productPool = mock(Pool);

      const product1 = generator.product({
        store: store.id,
      });
      const product2 = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]));
      when(productPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne().populate('products', {
        pool: instance(productPool),
      });
      verify(mockedPool.query(anyString(), anything())).once();
      assert(result);
      result.should.deep.equal({
        ...store,
        products: [product1, product2],
      });

      const [storeQuery, storeQueryParams] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(productPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating collection with partial select and order', async () => {
      const product1 = generator.product({
        store: store.id,
      });
      const product2 = generator.product({
        store: store.id,
      });

      const product1Result = _.pick(product1, 'id', 'name');
      const product2Result = _.pick(product2, 'id', 'name');

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]), getQueryResult([product1Result, product2Result]));

      const result = await StoreRepository.findOne().populate('products', {
        select: ['name'],
        sort: 'aliases',
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...store,
        products: [product1Result, product2Result],
      });

      const [storeQuery, storeQueryParams] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "name","id" FROM "products" WHERE "store_id"=$1 ORDER BY "alias_names"');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([store.id]);
    });
    it('should support populating multi-multi collection', async () => {
      const category1 = generator.category();
      const category2 = generator.category();
      const productCategory1Map = generator.productCategory(product, category1);
      const productCategory2Map = generator.productCategory(product, category2);

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([productCategory1Map, productCategory2Map]), getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne().populate('categories');
      verify(mockedPool.query(anyString(), anything())).thrice();
      assert(result);
      result.should.deep.equal({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating multi-multi collection with implicit inherited pool override', async () => {
      const poolOverride = mock(Pool);
      const category1 = generator.category();
      const category2 = generator.category();
      const productCategory1Map = generator.productCategory(product, category1);
      const productCategory2Map = generator.productCategory(product, category2);

      when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([productCategory1Map, productCategory2Map]), getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne({
        pool: instance(poolOverride),
      }).populate('categories');

      verify(mockedPool.query(anyString(), anything())).never();
      verify(poolOverride.query(anyString(), anything())).thrice();
      assert(result);
      result.should.deep.equal({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = capture(poolOverride.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(poolOverride.query).second();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(poolOverride.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating multi-multi collection with explicit pool override', async () => {
      const categoryPool = mock(Pool);

      const category1 = generator.category();
      const category2 = generator.category();
      const productCategory1Map = generator.productCategory(product, category1);
      const productCategory2Map = generator.productCategory(product, category2);

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      when(categoryPool.query(anyString(), anything())).thenResolve(getQueryResult([productCategory1Map, productCategory2Map]), getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne().populate('categories', {
        pool: instance(categoryPool),
      });

      verify(mockedPool.query(anyString(), anything())).once();
      verify(categoryPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...product,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(categoryPool.query).first();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(categoryPool.query).second();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      assert(categoryQueryParams);
      categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating multi-multi collection with partial select and order', async () => {
      const category1 = generator.category();
      const category2 = generator.category();
      const productCategory1Map = generator.productCategory(product, category1);
      const productCategory2Map = generator.productCategory(product, category2);

      const category1Result = _.pick(category1, 'id', 'name');
      const category2Result = _.pick(category2, 'id', 'name');

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
        getQueryResult([productCategory1Map, productCategory2Map]),
        getQueryResult([category1Result, category2Result]),
      );

      const result = await ProductRepository.findOne().populate('categories', {
        select: ['name'],
        sort: 'name desc',
      });
      verify(mockedPool.query(anyString(), anything())).thrice();
      assert(result);
      result.should.deep.equal({
        ...product,
        categories: [category1Result, category2Result],
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "name","id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name" DESC');
      assert(categoryQueryParams);
      categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating self reference collection', async () => {
      const source1 = generator.simpleWithSelfReference();
      const translation1 = generator.simpleWithSelfReference({
        name: 'translation1',
        source: source1.id,
      });
      const translation2 = generator.simpleWithSelfReference({
        name: 'translation2',
        source: source1.id,
      });

      const source1Result = _.pick(source1, 'id', 'name');

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([source1Result]), getQueryResult([translation1, translation2]));

      const result = await SimpleWithSelfReferenceRepository.findOne({
        select: ['name'],
      })
        .where({
          id: source1.id,
        })
        .populate('translations');
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...source1Result,
        translations: [translation1, translation2],
      });
      result.translations.length.should.equal(2);
      result.translations[0].id.should.equal(translation1.id);

      const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
      sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      assert(sourceQueryParams);
      sourceQueryParams.should.deep.equal([source1.id]);
      const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
      translationsQuery.should.equal('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=$1');
      assert(translationsQueryParams);
      translationsQueryParams.should.deep.equal([source1.id]);
    });
    it('should support populating collection and not explicitly selecting relation column', async () => {
      const source1 = generator.simpleWithSelfReference();
      const translation1 = generator.simpleWithSelfReference({
        name: 'translation1',
        source: source1.id,
      });
      const translation2 = generator.simpleWithSelfReference({
        name: 'translation2',
        source: source1.id,
      });

      const source1Result = _.pick(source1, 'id', 'name');
      const translation1Result = _.pick(translation1, 'id', 'name');
      const translation2Result = _.pick(translation2, 'id', 'name');

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([source1Result]), getQueryResult([translation1Result, translation2Result]));

      const result = await SimpleWithSelfReferenceRepository.findOne({
        select: ['name'],
      })
        .where({
          id: source1.id,
        })
        .populate('translations', {
          select: ['id', 'name'],
        });
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result);
      result.should.deep.equal({
        ...source1Result,
        translations: [translation1Result, translation2Result],
      });
      result.translations.length.should.equal(2);
      result.translations[0].id.should.equal(translation1.id);

      const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
      sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      assert(sourceQueryParams);
      sourceQueryParams.should.deep.equal([source1.id]);
      const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
      translationsQuery.should.equal('SELECT "id","name" FROM "simple" WHERE "source_id"=$1');
      assert(translationsQueryParams);
      translationsQueryParams.should.deep.equal([source1.id]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const category1 = generator.category();
      const category2 = generator.category();
      const productCategory1Map = generator.productCategory(product, category1);
      const productCategory2Map = generator.productCategory(product, category2);

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
        getQueryResult([store]),
        getQueryResult([productCategory1Map, productCategory2Map]),
        getQueryResult([category1, category2]),
      );

      const result = await ProductRepository.findOne()
        .where({
          store: store.id,
        })
        .populate('store', {
          where: {
            name: {
              like: 'store%',
            },
          },
        })
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
      verify(mockedPool.query(anyString(), anything())).times(4);
      assert(result);
      result.should.deep.equal({
        ...product,
        store,
        categories: [category1, category2],
      });

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      assert(productQueryParams);
      productQueryParams.should.deep.equal([store.id]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 AND "name" ILIKE $2');
      assert(storeQueryParams);
      storeQueryParams.should.deep.equal([store.id, 'store%']);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).third();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      assert(productCategoryMapQueryParams);
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).byCallIndex(3);
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      assert(categoryQueryParams);
      categoryQueryParams.should.deep.equal([[category1.id, category2.id], 'category%']);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const result = {
        id: faker.datatype.number(),
        name: `sink - ${faker.datatype.uuid()}`,
      };
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([result]));

      const result1 = await ReadonlyKitchenSinkRepository.findOne();
      const result2 = await ReadonlyKitchenSinkRepository.findOne();

      verify(mockedPool.query(anyString(), anything())).twice();

      assert(result1);
      result1.should.deep.equal(result2);
      result1.instanceFunction().should.equal(`${result.name} bar!`);
      assert(result2);
      result2.instanceFunction().should.equal(`${result.name} bar!`);
    });
    it('should not create an object/assign instance functions to null results', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve({
        command: 'select',
        rowCount: 1,
        oid: 1,
        fields: [],
        rows: [null],
      });

      const result = await ReadonlyKitchenSinkRepository.findOne();

      verify(mockedPool.query(anyString(), anything())).once();

      should.not.exist(result);
    });
    it('should allow querying required string array', async () => {
      const anotherSimple = generator.simpleWithStringId();
      const otherSimple = generator.simpleWithStringId({
        otherId: anotherSimple.id,
      });
      const simple = generator.simpleWithStringCollection();

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));

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
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","other_ids" AS "otherIds" FROM "simple" WHERE (("id"=$1) OR (($2=ANY("other_ids") OR $3=ANY("other_ids")))) LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.id, otherSimple.id, anotherSimple.id]);
    });
    it('should support an object with an enum/union field', async () => {
      const simple = generator.simpleWithUnion();

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithUnionRepository.findOne().where({
        status: ['Bar', 'Foo'],
      });
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "status"=ANY($1::TEXT[]) LIMIT 1');
      assert(params);
      params.should.deep.equal([['Bar', 'Foo']]);
    });
    it('should support an object with negated enum/union field', async () => {
      const simple = generator.simpleWithUnion();

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithUnionRepository.findOne().where({
        status: {
          '!': ['Bar', 'Foo'],
        },
      });
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "status"<>ALL($1::TEXT[]) LIMIT 1');
      assert(params);
      params.should.deep.equal([['Bar', 'Foo']]);
    });
    it('should support an object with an optional enum/union field', async () => {
      const simple = generator.simpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnum> = {
        name: simple.name,
      };

      const { status } = simple;

      if (status) {
        whereClause.status = {
          like: status,
        };
      }

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne().where(whereClause);
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" ILIKE $2 LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.name, status]);
    });
    it('should support an object with an optional enum/union array', async () => {
      const simple = generator.simpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnum> = {
        name: simple.name,
        status: {
          like: ['Bar', 'Foo', null],
        },
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne().where(whereClause);
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND ("status" ILIKE $2 OR "status" ILIKE $3 OR "status" IS NULL) LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.name, 'Bar', 'Foo']);
    });
    it('should support an object with an optional negated enum/union field', async () => {
      const simple = generator.simpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnum> = {
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne().where(whereClause);
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" NOT ILIKE $2 LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.name, status]);
    });
    it('should support an object with an optional negated enum/union array', async () => {
      const simple = generator.simpleWithOptionalEnum();

      const whereClause: WhereQuery<SimpleWithOptionalEnum> = {
        name: simple.name,
        status: {
          '!': {
            like: ['Bar', 'Foo', null],
          },
        },
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithOptionalEnumRepository.findOne().where(whereClause);
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "name"=$1 AND "status" NOT ILIKE $2 AND "status" NOT ILIKE $3 AND "status" IS NOT NULL LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.name, 'Bar', 'Foo']);
    });
    it('should support an object with a json field', async () => {
      const simple = generator.simpleWithJson();

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithJsonRepository.findOne();
      assert(result);
      result.should.deep.equal(simple);
      assert(result.keyValue);
      result.keyValue.should.deep.equal(simple.keyValue);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","bar","key_value" AS "keyValue" FROM "simple" LIMIT 1');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support an object with a json field (with id property)', async () => {
      const simple = generator.simpleWithRelationAndJson({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithRelationAndJsonRepository.findOne().where({
        or: [
          {
            name: simple.name,
            id: simple.id,
          },
        ],
        id: 42,
      });
      assert(result);
      result.should.deep.equal(simple);
      assert(result.message);
      result.message.id.should.equal(simple.message.id);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store","message" FROM "simple" WHERE ("name"=$1 AND "id"=$2) AND "id"=$3 LIMIT 1');
      assert(params);
      params.should.deep.equal([simple.name, simple.id, 42]);
    });
    it('should support an object with a json field (with id property) and populate statement', async () => {
      const simple = generator.simpleWithRelationAndJson({
        store: store.id,
      });

      const storeResult = _.pick(store, 'id', 'name');

      when(mockedPool.query(anyString(), anything()))
        .thenResolve(getQueryResult([simple]))
        .thenResolve(getQueryResult([storeResult]));
      const result = await SimpleWithRelationAndJsonRepository.findOne().populate('store', {
        select: ['name'],
      });
      assert(result);
      result.should.deep.equal({
        ...simple,
        store: storeResult,
      });
      assert(result.message);
      result.message.id.should.equal(simple.message.id);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store","message" FROM "simple" LIMIT 1');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: faker.datatype.number(),
            name: 'Product',
            store: store.id,
          },
        ]),
        getQueryResult([store]),
      );

      const productResult = await ProductRepository.findOne().UNSAFE_withOriginalFieldType('store');
      assert(productResult);
      const storeResult = await StoreRepository.findOne().where({
        id: productResult.store,
      });
      assert(storeResult);

      productResult.store = storeResult;
      productResult.store.id.should.equal(store.id);
      assert(productResult.store.name);
      productResult.store.name.should.equal(store.name);
    });
    it('should support manually setting a field - UNSAFE_withFieldValue()', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: faker.datatype.number(),
            name: 'Product',
            store: store.id,
          },
        ]),
        getQueryResult([store]),
      );

      const productResult = await ProductRepository.findOne().UNSAFE_withFieldValue('store', store);
      assert(productResult);

      productResult.store.id.should.equal(store.id);
      assert(productResult.store.name);
      productResult.store.name.should.equal(store.name);
    });
  });
  describe('#find()', () => {
    let store: QueryResult<Store>;
    beforeEach(() => {
      store = generator.store();
    });

    it('should support call without constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find();
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find({
        select: ['name'],
        where: {
          id: _.map(products, 'id'),
          store,
        },
        sort: 'name asc',
        skip: 5,
        limit: 24,
      });
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      assert(params);
      params.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find({
        id: _.map(products, 'id'),
        store,
      });
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      params.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call with explicit pool override', async () => {
      const poolOverride = mock(Pool);
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find({
        pool: instance(poolOverride),
      });
      assert(result);
      result.should.deep.equal(products);

      verify(mockedPool.query(anyString(), anything())).never();
      const [query, params] = capture(poolOverride.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      assert(params);
      params.should.deep.equal([]);
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().where({
        store: store.id,
      });
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - array ILIKE array of values', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().where({
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
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal(
        'SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE (("name" ILIKE $1) OR ("name" ILIKE $2)) AND (EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $3) OR EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $4))',
      );
      assert(params);
      params.should.deep.equal(['product', 'Foo Bar', 'Foo', 'BAR']);
    });
    it('should support call with chained where constraints - NOT ILIKE array of values', async () => {
      const products = [
        generator.product({
          store: store.id,
          sku: faker.datatype.uuid(),
        }),
        generator.product({
          store: store.id,
          sku: faker.datatype.uuid(),
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().where({
        sku: {
          '!': {
            like: ['Foo', 'BAR'],
          },
        },
      });
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "sku" NOT ILIKE $1 AND "sku" NOT ILIKE $2');
      assert(params);
      params.should.deep.equal(['Foo', 'BAR']);
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.find().where({
          store: store.id,
        }),
      ]);
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with chained sort', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().sort('name asc');
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with chained limit', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().limit(42);
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 42');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with chained skip', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().skip(24);
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" OFFSET 24');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with chained paginate', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().paginate({
        page: 3,
        limit: 100,
      });
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 100 OFFSET 200');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.find()
        .where({
          store: store.id,
        })
        .skip(24)
        .limit(42)
        .sort('store desc');

      verify(mockedPool.query(anyString(), anything())).once();
      assert(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const result = {
        id: faker.datatype.number(),
        name: `sink - ${faker.datatype.uuid()}`,
      };
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([result]));

      const result1 = await ReadonlyKitchenSinkRepository.find();
      const result2 = await ReadonlyKitchenSinkRepository.find();
      verify(mockedPool.query(anyString(), anything())).twice();
      assert(result1);
      assert(result2);
      result1.should.deep.equal(result2);
      result1[0].instanceFunction().should.equal(`${result.name} bar!`);
      result2[0].instanceFunction().should.equal(`${result.name} bar!`);
    });
    it('should allow types when used in promise.all with other queries', async () => {
      const three1 = generator.levelThree({
        foo: `three1: ${faker.datatype.uuid()}`,
      });
      const three2 = generator.levelThree({
        foo: `three2: ${faker.datatype.uuid()}`,
      });
      const two = generator.levelTwo({
        foo: `two: ${faker.datatype.uuid()}`,
        levelThree: three1.id,
      });
      const one = generator.levelOne({
        foo: `one: ${faker.datatype.uuid()}`,
        levelTwo: two.id,
      });
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([one]), getQueryResult([two]), getQueryResult([three1, three2]));

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
        LevelTwoRepository.findOne(),
        LevelThreeRepository.find({
          select: ['three', 'foo'],
        }).where({
          foo: [three1.foo, three2.foo],
        }),
      ]);

      verify(mockedPool.query(anyString(), anything())).thrice();
      ones.should.deep.equal([one]);
      ones.length.should.equal(1);
      ones[0].one.should.deep.equal(one.one);

      assert(twoResult);
      twoResult.should.deep.equal(two);
      twoResult.two.should.deep.equal(two.two);

      threes.should.deep.equal([three1, three2]);
      threes.length.should.equal(2);
      threes[0].three.should.equal(three1.three);
      threes[1].three.should.equal(three2.three);

      const [levelOneQuery, levelOneQueryParams] = capture(mockedPool.query).first();
      levelOneQuery.should.equal('SELECT "one","id" FROM "level_one" WHERE "foo"=ANY($1::TEXT[])');
      assert(levelOneQueryParams);
      levelOneQueryParams.should.deep.equal([[one.foo, two.foo, three1.foo.toUpperCase(), three2.foo.toUpperCase()]]);

      const [levelTwoQuery, levelTwoQueryParams] = capture(mockedPool.query).second();
      levelTwoQuery.should.equal('SELECT "id","two","foo","level_three_id" AS "levelThree" FROM "level_two" LIMIT 1');
      assert(levelTwoQueryParams);
      levelTwoQueryParams.should.deep.equal([]);

      const [levelThreeQuery, levelThreeQueryParams] = capture(mockedPool.query).third();
      levelThreeQuery.should.equal('SELECT "three","foo","id" FROM "level_three" WHERE "foo"=ANY($1::TEXT[])');
      assert(levelThreeQueryParams);
      levelThreeQueryParams.should.deep.equal([[three1.foo, three2.foo]]);
    });
    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      const product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([store]));

      const products = await ProductRepository.find().UNSAFE_withOriginalFieldType('store');
      products.length.should.equal(1);
      const [productResult] = products;
      const stores = await StoreRepository.find().where({
        id: productResult.store,
      });
      stores.length.should.equal(1);
      const [storeResult] = stores;

      productResult.store = storeResult;
      productResult.store.id.should.equal(store.id);
      assert(productResult.store.name);
      productResult.store.name.should.equal(store.name);
    });
    describe('populate', () => {
      let store1: QueryResult<Store>;
      let store2: QueryResult<Store>;
      let product1: QueryResult<Product>;
      let product2: QueryResult<Product>;
      let product3: QueryResult<Product>;
      let category1: QueryResult<Category>;
      let category2: QueryResult<Category>;
      let product1Category1: QueryResult<ProductCategory>;
      let product1Category2: QueryResult<ProductCategory>;
      let product2Category1: QueryResult<ProductCategory>;
      let product3Category1: QueryResult<ProductCategory>;

      let teacher1: QueryResult<Teacher>;
      let teacher2: QueryResult<Teacher>;
      let parkingLot: QueryResult<ParkingLot>;
      let parkingSpace: QueryResult<ParkingSpace>;
      let classroom: QueryResult<Classroom>;
      let teacher1Classroom: QueryResult<TeacherClassroom>;

      let source1: QueryResult<SimpleWithSelfReference>;
      let source2: QueryResult<SimpleWithSelfReference>;
      let translation1: QueryResult<SimpleWithSelfReference>;
      let translation2: QueryResult<SimpleWithSelfReference>;

      let levelOneItem: QueryResult<LevelOne>;
      let levelTwoItem: QueryResult<LevelTwo>;
      let levelThreeItem: QueryResult<LevelThree>;

      before(() => {
        store1 = generator.store();
        store2 = generator.store();

        product1 = generator.product({
          store: store1.id,
        });
        product2 = generator.product({
          store: store2.id,
        });
        product3 = generator.product({
          store: store1.id,
        });

        category1 = generator.category();
        category2 = generator.category();

        product1Category1 = generator.productCategory(product1.id, category1.id);
        product1Category2 = generator.productCategory(product1.id, category2.id);
        product2Category1 = generator.productCategory(product2, category1);
        product3Category1 = generator.productCategory(product3, category1);

        parkingLot = generator.parkingLot();
        parkingSpace = generator.parkingSpace({
          parkingLot: parkingLot.id,
        });

        teacher1 = generator.teacher({
          parkingSpace: parkingSpace.id,
        });
        teacher2 = generator.teacher();

        classroom = generator.classroom();

        teacher1Classroom = generator.teacherClassroom(teacher1, classroom);

        source1 = generator.simpleWithSelfReference();
        source2 = generator.simpleWithSelfReference();

        translation1 = generator.simpleWithSelfReference({
          source: source1.id,
        });
        translation2 = generator.simpleWithSelfReference({
          source: source1.id,
        });

        levelThreeItem = generator.levelThree();
        levelTwoItem = generator.levelTwo({
          levelThree: levelThreeItem.id,
        });
        levelOneItem = generator.levelOne({
          levelTwo: levelTwoItem.id,
        });
      });

      it('should support populating a single relation - same/shared', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product3]), getQueryResult([store1]));

        const results = await ProductRepository.find().populate('store');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([store1.id]);
      });
      it('should support populating a single relation - different', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([product1, product2]),
          getQueryResult([
            // NOTE: Swapping the order to make sure that order doesn't matter
            store2,
            store1,
          ]),
        );

        const results = await ProductRepository.find().populate('store');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...product1,
            store: store1,
          },
          {
            ...product2,
            store: store2,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating a single relation with implicit inherited pool override', async () => {
        const poolOverride = mock(Pool);

        when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([product1, product3]), getQueryResult([store1]));

        const results = await ProductRepository.find({
          pool: instance(poolOverride),
        }).populate('store');

        verify(mockedPool.query(anyString(), anything())).never();
        verify(poolOverride.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = capture(poolOverride.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(poolOverride.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([store1.id]);
      });
      it('should support populating a single relation with explicit pool override', async () => {
        const storePool = mock(Pool);

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product3]));
        when(storePool.query(anyString(), anything())).thenResolve(getQueryResult([store1]));

        const results = await ProductRepository.find().populate('store', {
          pool: instance(storePool),
        });

        verify(mockedPool.query(anyString(), anything())).once();
        verify(storePool.query(anyString(), anything())).once();
        results.should.deep.equal([
          {
            ...product1,
            store: store1,
          },
          {
            ...product3,
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(storePool.query).first();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([store1.id]);
      });
      it('should support populating a single relation as QueryResult with partial select', async () => {
        const levelOneResult = _.pick(levelOneItem, 'id', 'one', 'levelTwo');
        const levelTwoResult = _.pick(levelTwoItem, 'id', 'two', 'levelThree');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([levelOneResult]), getQueryResult([levelTwoResult]));

        const results = await LevelOneRepository.find({
          select: ['one', 'levelTwo'],
        }).populate('levelTwo', {
          select: ['two', 'levelThree'],
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...levelOneResult,
            levelTwo: levelTwoResult,
          },
        ]);

        results[0].levelTwo.levelThree.should.equal(levelThreeItem.id);
        results[0].levelTwo.levelThree.toUpperCase().should.equal(levelThreeItem.id.toUpperCase());
      });
      it('should support populating a single relation with partial select and sort', async () => {
        const store1Result = _.pick(store1, 'id');
        const store2Result = _.pick(store2, 'id');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product2]), getQueryResult([store1Result, store2Result]));

        const results = await ProductRepository.find().populate('store', {
          select: ['id'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...product1,
            store: store1Result,
          },
          {
            ...product2,
            store: store2Result,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id" FROM "stores" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating a single relation when column is missing from partial select', async () => {
        const product1Result = _.pick(product1, 'id', 'name', 'store');
        const product2Result = _.pick(product2, 'id', 'name', 'store');
        const store1Result = _.pick(store1, 'id');
        const store2Result = _.pick(store2, 'id');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product1Result, product2Result]), getQueryResult([store1Result, store2Result]));

        const results = await ProductRepository.find({
          select: ['name'],
        }).populate('store', {
          select: ['id'],
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...product1Result,
            store: store1Result,
          },
          {
            ...product2Result,
            store: store2Result,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "name","store_id" AS "store","id" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store1, store2]), getQueryResult([product1, product3, product2]));

        const results = await StoreRepository.find().populate('products');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection with implicit inherited pool override', async () => {
        const poolOverride = mock(Pool);

        when(poolOverride.query(anyString(), anything())).thenResolve(getQueryResult([store1, store2]), getQueryResult([product1, product3, product2]));

        const results = await StoreRepository.find({
          pool: instance(poolOverride),
        }).populate('products');

        verify(mockedPool.query(anyString(), anything())).never();
        verify(poolOverride.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(poolOverride.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(poolOverride.query).second();
        storeQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection with explicit pool override', async () => {
        const productPool = mock(Pool);

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store1, store2]));
        when(productPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product3, product2]));

        const results = await StoreRepository.find().populate('products', {
          pool: instance(productPool),
        });
        verify(mockedPool.query(anyString(), anything())).once();
        verify(productPool.query(anyString(), anything())).once();
        results.should.deep.equal([
          {
            ...store1,
            products: [product1, product3],
          },
          {
            ...store2,
            products: [product2],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(productPool.query).first();
        storeQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection with partial select and sort', async () => {
        const product1Result = _.pick(product1, 'id', 'name', 'sku', 'store');
        const product2Result = _.pick(product2, 'id', 'name', 'sku', 'store');
        const product3Result = _.pick(product3, 'id', 'name', 'sku', 'store');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store1, store2]), getQueryResult([product1Result, product3Result, product2Result]));

        const results = await StoreRepository.find().populate('products', {
          select: ['name', 'sku', 'store'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...store1,
            products: [product1Result, product3Result],
          },
          {
            ...store2,
            products: [product2Result],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "name","sku","store_id" AS "store","id" FROM "products" WHERE "store_id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating multi-multi collection', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([product1, product3, product2]))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([category1, category2]));

        const results = await ProductRepository.find().populate('categories');
        verify(mockedPool.query(anyString(), anything())).thrice();
        results.should.deep.equal([
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
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).second();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        productCategoryQueryParams.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multi-multi collection with implicit inherited pool override', async () => {
        const poolOverride = mock(Pool);
        when(poolOverride.query(anyString(), anything()))
          .thenResolve(getQueryResult([product1, product3, product2]))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([category1, category2]));

        const results = await ProductRepository.find({
          pool: instance(poolOverride),
        }).populate('categories');

        verify(mockedPool.query(anyString(), anything())).never();
        verify(poolOverride.query(anyString(), anything())).thrice();
        results.should.deep.equal([
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
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(poolOverride.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(poolOverride.query).second();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        productCategoryQueryParams.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(poolOverride.query).third();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multi-multi collection with explicit pool override', async () => {
        const productPool = mock(Pool);
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product1, product3, product2]));
        when(productPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([category1, category2]));

        const results = await ProductRepository.find().populate('categories', {
          pool: instance(productPool),
        });

        verify(mockedPool.query(anyString(), anything())).once();
        verify(productPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
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
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(productPool.query).first();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        productCategoryQueryParams.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(productPool.query).second();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multi-multi collection with partial select and sort', async () => {
        const category1Result = _.pick(category1, 'id');
        const category2Result = _.pick(category2, 'id');

        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([product1, product3, product2]))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([category1Result, category2Result]));

        const results = await ProductRepository.find().populate('categories', {
          select: ['id'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).thrice();
        results.should.deep.equal([
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
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).second();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        productCategoryQueryParams.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
        categoryQuery.should.equal('SELECT "id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multiple properties', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([product1, product3, product2]))
          .thenResolve(
            getQueryResult([
              // NOTE: Swapping the order to make sure that order doesn't matter
              store2,
              store1,
            ]),
          )
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([category1, category2]));

        const results = await ProductRepository.find().populate('store').populate('categories');
        results.should.deep.equal([
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
        verify(mockedPool.query(anyString(), anything())).times(4);
        results[0].store.id.should.equal(store1.id);
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        assert(productQueryParams);
        productQueryParams.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        assert(storeQueryParams);
        storeQueryParams.should.deep.equal([[store1.id, store2.id]]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).third();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        assert(productCategoryQueryParams);
        productCategoryQueryParams.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).last();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([[category1.id, category2.id]]);

        results[0].store.id.should.equal(store1.id);
      });
      it('should support populating multiple properties with partial select and sort', async () => {
        const parkingSpaceResult = _.pick(parkingSpace, 'id', 'name');
        const classroomResult = _.pick(classroom, 'id', 'name');

        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([teacher1, teacher2]))
          .thenResolve(getQueryResult([parkingSpaceResult]))
          .thenResolve(getQueryResult([teacher1Classroom]))
          .thenResolve(getQueryResult([classroomResult]));

        async function getTeachers(): Promise<
          (Omit<QueryResult<Teacher>, 'parkingSpace'> & {
            parkingSpace: QueryResult<Pick<ParkingSpace, 'getLotAndName' | 'id' | 'name'>> | null;
            classrooms: QueryResult<Pick<Classroom, 'id' | 'name'>>[];
          })[]
        > {
          return TeacherRepository.find()
            .where({
              isActive: true,
            })
            .sort('lastName')
            .populate('parkingSpace', {
              select: ['name'],
            })
            .populate('classrooms', {
              select: ['name'],
              where: {
                name: {
                  like: 'classroom%',
                },
              },
            });
        }

        const results = await getTeachers();
        results.should.deep.equal([
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
        verify(mockedPool.query(anyString(), anything())).times(4);
        results[0].parkingSpace?.id.should.equal(parkingSpace.id);
        results[0].classrooms.length.should.equal(1);
        results[0].classrooms[0].id.should.equal(classroom.id);

        const [teacherQuery, teacherQueryParams] = capture(mockedPool.query).first();
        teacherQuery.should.equal(
          'SELECT "id","first_name" AS "firstName","last_name" AS "lastName","parking_space_id" AS "parkingSpace","is_active" AS "isActive" FROM "teacher" WHERE "is_active"=$1 ORDER BY "last_name"',
        );
        assert(teacherQueryParams);
        teacherQueryParams.should.deep.equal([true]);
        const [parkingSpaceQuery, parkingSpaceQueryParams] = capture(mockedPool.query).second();
        parkingSpaceQuery.should.equal('SELECT "name","id" FROM "parking_space" WHERE "id"=$1');
        assert(parkingSpaceQueryParams);
        parkingSpaceQueryParams.should.deep.equal([parkingSpace.id]);
        const [teacherClassroomQuery, teacherClassroomQueryParams] = capture(mockedPool.query).third();
        teacherClassroomQuery.should.equal('SELECT "teacher_id" AS "teacher","classroom_id" AS "classroom","id" FROM "teacher__classroom" WHERE "teacher_id"=ANY($1::TEXT[])');
        assert(teacherClassroomQueryParams);
        teacherClassroomQueryParams.should.deep.equal([[teacher1.id, teacher2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).last();
        categoryQuery.should.equal('SELECT "name","id" FROM "classroom" WHERE "id"=$1 AND "name" ILIKE $2');
        assert(categoryQueryParams);
        categoryQueryParams.should.deep.equal([classroom.id, 'classroom%']);
      });
      it('should support populating self reference', async () => {
        const source1Result = _.pick(source1, 'id', 'name');
        const source2Result = _.pick(source2, 'id', 'name');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([source1Result, source2Result]), getQueryResult([translation1, translation2]));

        const results = await SimpleWithSelfReferenceRepository.find({
          select: ['name'],
        })
          .where({
            source: null,
          })
          .populate('translations');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ...source1Result,
            translations: [translation1, translation2],
          },
          {
            ...source2Result,
            translations: [],
          },
        ]);
        results[0].translations.length.should.equal(2);
        results[0].translations[0].id.should.equal(translation1.id);

        const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
        sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "source_id" IS NULL');
        assert(sourceQueryParams);
        sourceQueryParams.should.deep.equal([]);
        const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
        translationsQuery.should.equal('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=ANY($1::TEXT[])');
        assert(translationsQueryParams);
        translationsQueryParams.should.deep.equal([[source1.id, source2.id]]);
      });
      it('should throw when attempting to populate collection and not not explicitly specifying relation column', async () => {
        const source1Result = _.pick(source1, 'id', 'name');
        const source2Result = _.pick(source2, 'id', 'name');
        const translation1Result = _.pick(translation1, 'id', 'name', 'source');
        const translation2Result = _.pick(translation2, 'id', 'name', 'source');

        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([source1Result, source2Result]), getQueryResult([translation1Result, translation2Result]));

        try {
          await SimpleWithSelfReferenceRepository.find({
            select: ['name'],
          })
            .where({
              source: null,
            })
            .populate('translations', {
              select: ['id', 'name'],
            });
          assert.fail('Should not get here');
        } catch (ex) {
          if (ex instanceof Error) {
            ex.message.should.equal('Unable to populate "translations" on SimpleWithSelfReference. "source" is not included in select array.');
          } else {
            assert.fail('Exception was not of type Error');
          }
        }
      });
    });
  });
  describe('#count()', () => {
    let store: QueryResult<Store>;
    beforeEach(() => {
      store = generator.store();
    });

    it('should support call without constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count();
      assert(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should support call with explicit pool override', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      const poolOverride = mock(Pool);

      when(poolOverride.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        pool: instance(poolOverride),
      });
      assert(result);
      result.should.deep.equal(products.length);

      verify(mockedPool.query(anyString(), anything())).never();
      const [query, params] = capture(poolOverride.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products"');
      assert(params);
      params.should.deep.equal([]);
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

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        id: _.map(products, 'id'),
        store,
      });
      assert(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      params.should.deep.equal([_.map(products, 'id'), store.id]);
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

      when(mockedPool.query(anyString(), anything())).thenResolve(
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
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with explicit pool override and chained where constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      const poolOverride = mock(Pool);

      when(poolOverride.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count({
        pool: instance(poolOverride),
      }).where({
        store: store.id,
      });
      assert(result);
      result.should.equal(products.length);

      verify(mockedPool.query(anyString(), anything())).never();
      const [query, params] = capture(poolOverride.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
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

      when(mockedPool.query(anyString(), anything())).thenResolve(
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
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
  });
});
