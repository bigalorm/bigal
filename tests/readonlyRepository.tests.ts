import assert from 'assert';

import chai from 'chai';
import * as faker from 'faker';
import _ from 'lodash';
import type { QueryResult } from 'pg';
import { Pool } from 'postgres-pool';
import { anyString, anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';

import type { Repository, ReadonlyRepository, QueryResultPopulated, NotEntity } from '../src';
import { initialize } from '../src';

import type { IJsonLikeEntity } from './models';
import {
  Category,
  Classroom,
  KitchenSink,
  ParkingSpace,
  Product,
  ProductCategory,
  ReadonlyProduct,
  SimpleWithJson,
  SimpleWithRelationAndJson,
  SimpleWithSelfReference,
  SimpleWithStringCollection,
  SimpleWithStringId,
  SimpleWithUnion,
  Store,
  Teacher,
  TeacherClassroom,
} from './models';

function getQueryResult<T>(rows: T[] = []): QueryResult<T> {
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
  let ProductRepository: Repository<Product>;
  let ReadonlyProductRepository: ReadonlyRepository<ReadonlyProduct>;
  let ReadonlyKitchenSinkRepository: ReadonlyRepository<KitchenSink>;
  let StoreRepository: Repository<Store>;
  let SimpleWithJsonRepository: Repository<SimpleWithJson>;
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
        ParkingSpace,
        Product,
        ProductCategory,
        ReadonlyProduct,
        SimpleWithJson,
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

    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ReadonlyProductRepository = repositoriesByModelName.ReadonlyProduct as ReadonlyRepository<ReadonlyProduct>;
    ReadonlyKitchenSinkRepository = repositoriesByModelName.KitchenSink as ReadonlyRepository<KitchenSink>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
    SimpleWithJsonRepository = repositoriesByModelName.SimpleWithJson as Repository<SimpleWithJson>;
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
    it('should support call without constraints', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      const result = await ReadonlyProductRepository.findOne();
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" LIMIT 1');
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        select: ['name'],
        where: {
          id: product.id,
        },
        sort: 'name asc',
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter and querying id by entity value', async () => {
      const product = new Product();
      product.id = faker.datatype.number();
      product.name = `product - ${faker.datatype.uuid()}`;

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter and querying property by entity value', async () => {
      const productStore = new Store();
      productStore.id = faker.datatype.number();
      productStore.name = `store - ${faker.datatype.uuid()}`;

      const product = new Product();
      product.id = faker.datatype.number();
      product.name = `product - ${faker.datatype.uuid()}`;
      product.store = productStore.id;

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        store: productStore,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 LIMIT 1');
      params!.should.deep.equal([productStore.id]);
    });
    it('should support call with chained where constraints', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().where({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const [result] = await Promise.all([
        ProductRepository.findOne().where({
          id: product.id,
        }),
      ]);
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained sort', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().sort('name asc');
      should.exist(result);
      result!.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name" LIMIT 1');
      params!.should.deep.equal([]);
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
        should.exist(result);

        result!.should.deep.equal({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          intColumn: 42,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          intColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          intColumn: largeNumberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          floatColumn: numberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
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
        should.exist(result);
        result!.should.deep.equal({
          id,
          name,
          floatColumn: largeNumberValue,
        });

        const [query, params] = capture(mockedPool.query).first();
        query.should.equal(
          `SELECT "id","name","int_column" AS "intColumn","float_column" AS "floatColumn","array_column" AS "arrayColumn","string_array_column" AS "stringArrayColumn" FROM "${ReadonlyKitchenSinkRepository.model.tableName}" LIMIT 1`,
        );
        params!.should.deep.equal([]);
      });
    });
    it('should support populating a single relation', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
        store,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: product.id,
            name: product.name,
            store: store.id,
          },
        ]),
        getQueryResult([store]),
      );

      const result = await ProductRepository.findOne().populate('store');
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      result!.should.deep.equal(product);

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating a single relation with partial select and order', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
        store,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: product.id,
            name: product.name,
            store: store.id,
          },
        ]),
        getQueryResult([store]),
      );

      const result = await ProductRepository.findOne().populate('store', {
        select: ['name'],
        sort: 'name',
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      result!.should.deep.equal(product);

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "name","id" FROM "stores" WHERE "id"=$1 ORDER BY "name"');
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating collection', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = `store - ${faker.datatype.uuid()}`;

      const product1 = new Product();
      product1.id = faker.datatype.number();
      product1.name = `product - ${faker.datatype.uuid()}`;
      product1.store = store.id;

      const product2 = new Product();
      product2.id = faker.datatype.number();
      product2.name = `product - ${faker.datatype.uuid()}`;
      product2.store = store.id;

      const storeWithProducts: QueryResultPopulated<Store, 'products'> = {
        ...store,
        products: [product1, product2],
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]), getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne().populate('products');
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      result!.should.deep.equal(storeWithProducts);
      storeWithProducts.products.length.should.equal(2);

      const [storeQuery, storeQueryParams] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      storeQueryParams!.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      productQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating collection with partial select and order', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const product1 = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
        store: store.id,
      };
      const product2 = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
        store: store.id,
      };

      const storeWithProducts = _.extend(
        {
          products: [product1, product2],
        },
        store,
      );

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]), getQueryResult([product1, product2]));

      const result = await StoreRepository.findOne().populate('products', {
        select: ['name'],
        sort: 'aliases',
      });
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      result!.should.deep.equal(storeWithProducts);

      const [storeQuery, storeQueryParams] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      storeQueryParams!.should.deep.equal([]);
      const [productQuery, productQueryParams] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "name","id" FROM "products" WHERE "store_id"=$1 ORDER BY "alias_names"');
      productQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating multi-multi collection', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };
      const category1 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const category2 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category2.id,
      };

      const productWithCategories = _.extend(
        {
          categories: [category1, category2],
        },
        product,
      );

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([productCategory1Map, productCategory2Map]), getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne().populate('categories');
      verify(mockedPool.query(anyString(), anything())).thrice();
      should.exist(result);
      result!.should.deep.equal(productWithCategories);

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating multi-multi collection with partial select and order', async () => {
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
      };
      const category1 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const category2 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category2.id,
      };

      const productWithCategories = _.extend(
        {
          categories: [category1, category2],
        },
        product,
      );

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]), getQueryResult([productCategory1Map, productCategory2Map]), getQueryResult([category1, category2]));

      const result = await ProductRepository.findOne().populate('categories', {
        select: ['name'],
        sort: 'name desc',
      });
      verify(mockedPool.query(anyString(), anything())).thrice();
      should.exist(result);
      result!.should.deep.equal(productWithCategories);

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "name","id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name" DESC');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating self reference collection', async () => {
      const source1 = new SimpleWithSelfReference();
      source1.id = faker.datatype.uuid();
      source1.name = 'Source';

      const translation1 = new SimpleWithSelfReference();
      translation1.id = faker.datatype.uuid();
      translation1.name = 'translation1';
      translation1.source = source1.id;

      const translation2 = new SimpleWithSelfReference();
      translation2.id = faker.datatype.uuid();
      translation2.name = 'translation2';
      translation2.source = source1.id;

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([_.pick(source1, 'id', 'name')]),
        getQueryResult([_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')]),
      );

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
        ..._.pick(source1, 'id', 'name'),
        translations: [_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')],
      });
      result.translations.length.should.equal(2);
      result.translations[0].id.should.equal(translation1.id);

      const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
      sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      sourceQueryParams!.should.deep.equal([source1.id]);
      const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
      translationsQuery.should.equal('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=$1');
      translationsQueryParams!.should.deep.equal([source1.id]);
    });
    it('should support populating collection and not explicitly selecting relation column', async () => {
      const source1 = new SimpleWithSelfReference();
      source1.id = faker.datatype.uuid();
      source1.name = 'Source';

      const translation1 = new SimpleWithSelfReference();
      translation1.id = faker.datatype.uuid();
      translation1.name = 'translation1';
      translation1.source = source1.id;

      const translation2 = new SimpleWithSelfReference();
      translation2.id = faker.datatype.uuid();
      translation2.name = 'translation2';
      translation2.source = source1.id;

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([_.pick(source1, 'id', 'name')]),
        getQueryResult([_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')]),
      );

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
        ..._.pick(source1, 'id', 'name'),
        translations: [_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')],
      });
      result.translations.length.should.equal(2);
      result.translations[0].id.should.equal(translation1.id);

      const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
      sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "id"=$1 LIMIT 1');
      sourceQueryParams!.should.deep.equal([source1.id]);
      const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
      translationsQuery.should.equal('SELECT "id","name" FROM "simple" WHERE "source_id"=$1');
      translationsQueryParams!.should.deep.equal([source1.id]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const product = {
        id: faker.datatype.number(),
        name: `product - ${faker.datatype.uuid()}`,
        store: store.id,
      };
      const category1 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const category2 = {
        id: faker.datatype.number(),
        name: `category - ${faker.datatype.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.datatype.number(),
        product: product.id,
        category: category2.id,
      };

      const fullProduct = _.defaults(
        {
          store,
          categories: [category1, category2],
        },
        product,
      );

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
      should.exist(result);
      result!.should.deep.equal(fullProduct);

      const [productQuery, productQueryParams] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      productQueryParams!.should.deep.equal([store.id]);
      const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 AND "name" ILIKE $2');
      storeQueryParams!.should.deep.equal([store.id, 'store%']);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).third();
      productCategoryMapQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).byCallIndex(3);
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id], 'category%']);
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

      should.exist(result1);
      result1!.should.deep.equal(result2);
      result1!.instanceFunction().should.equal(`${result.name} bar!`);
      should.exist(result2);
      result2!.instanceFunction().should.equal(`${result.name} bar!`);
    });
    it('should not create an object/assign instance functions to null results', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([null]));

      const result = await ReadonlyKitchenSinkRepository.findOne();

      verify(mockedPool.query(anyString(), anything())).once();

      should.not.exist(result);
    });
    it('should allow querying required string array', async () => {
      const anotherSimple = new SimpleWithStringId();
      anotherSimple.id = faker.datatype.uuid();
      anotherSimple.name = 'anotherSimple';

      const otherSimple = new SimpleWithStringId();
      otherSimple.id = faker.datatype.uuid();
      otherSimple.name = 'otherSimple';
      otherSimple.otherId = anotherSimple;

      const simple = new SimpleWithStringCollection();
      simple.id = faker.datatype.number();
      simple.name = `product - ${faker.datatype.uuid()}`;
      simple.otherIds = [faker.datatype.uuid(), faker.datatype.uuid()];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));

      const result = await SimpleWithStringCollectionRepository.findOne({
        or: [
          {
            id: simple.id,
          },
          {
            otherIds: [otherSimple.id, otherSimple.otherId.id],
          },
        ],
      });
      should.exist(result);
      result!.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","other_ids" AS "otherIds" FROM "simple" WHERE (("id"=$1) OR (($2=ANY("other_ids") OR $3=ANY("other_ids")))) LIMIT 1');
      params!.should.deep.equal([simple.id, otherSimple.id, anotherSimple.id]);
    });
    it('should support an object with an enum/union field', async () => {
      const simple = {
        id: faker.datatype.number(),
        name: `simple - ${faker.datatype.uuid()}`,
        status: 'Foobar',
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithUnionRepository.findOne().where({
        status: ['Bar', 'Foo'],
      });
      assert(result);
      result.should.deep.equal(simple);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","status" FROM "simple" WHERE "status"=ANY($1::TEXT[]) LIMIT 1');
      params!.should.deep.equal([['Bar', 'Foo']]);
    });
    it('should support an object with negated enum/union field', async () => {
      const simple = {
        id: faker.datatype.number(),
        name: `simple - ${faker.datatype.uuid()}`,
        status: 'Foobar',
      };

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
      params!.should.deep.equal([['Bar', 'Foo']]);
    });
    it('should support an object with a json field', async () => {
      const simple = {
        id: faker.datatype.number(),
        name: `simple - ${faker.datatype.uuid()}`,
        keyValue: {
          foo: 42,
        },
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simple]));
      const result = await SimpleWithJsonRepository.findOne();
      assert(result);
      result.should.deep.equal(simple);
      result.keyValue?.should.deep.equal(simple.keyValue);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","bar","key_value" AS "keyValue" FROM "simple" LIMIT 1');
      params!.should.deep.equal([]);
    });
    it('should support an object with a json field (with id property)', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = `store - ${faker.datatype.uuid()}`;

      const simple = new SimpleWithRelationAndJson();
      simple.id = faker.datatype.number();
      simple.name = `simple - ${faker.datatype.uuid()}`;
      simple.store = store;
      simple.message = {
        id: 'foo',
        message: 'bar',
      } as NotEntity<IJsonLikeEntity>;

      const simpleQueryResult = {
        id: simple.id,
        name: simple.name,
        store: store.id,
        message: simple.message,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([simpleQueryResult]));
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
      result.should.deep.equal(simpleQueryResult);
      result.message?.id.should.equal(simple.message.id);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store","message" FROM "simple" WHERE ("name"=$1 AND "id"=$2) AND "id"=$3 LIMIT 1');
      params!.should.deep.equal([simple.name, simple.id, 42]);
    });
    it('should support an object with a json field (with id property) and populate statement', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = `store - ${faker.datatype.uuid()}`;

      const simple = new SimpleWithRelationAndJson();
      simple.id = faker.datatype.number();
      simple.name = `simple - ${faker.datatype.uuid()}`;
      simple.store = store;
      simple.message = {
        id: 'foo',
        message: 'bar',
      } as NotEntity<IJsonLikeEntity>;

      const simpleQueryResult = {
        id: simple.id,
        name: simple.name,
        store: store.id,
        message: simple.message,
      };

      const storeQueryResult = {
        id: store.id,
        name: store.name,
      };

      when(mockedPool.query(anyString(), anything()))
        .thenResolve(getQueryResult([simpleQueryResult]))
        .thenResolve(getQueryResult([storeQueryResult]));
      const result = await SimpleWithRelationAndJsonRepository.findOne().populate('store', {
        select: ['name'],
      });
      assert(result);
      result.should.deep.equal({
        ...simpleQueryResult,
        store: storeQueryResult,
      });
      result.message?.id.should.equal(simple.message.id);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store","message" FROM "simple" LIMIT 1');
      params!.should.deep.equal([]);
    });
    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = 'Store';

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
      productResult.store.name?.should.equal(store.name);
    });
    it('should support manually setting a field - UNSAFE_withFieldValue()', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = 'Store';

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
      productResult.store.name?.should.equal(store.name);
    });
  });
  describe('#find()', () => {
    it('should support call without constraints', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find();
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
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
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      params!.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      params!.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().where({
        store: store.id,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - array ILIKE array of values', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
          serialNumber: faker.datatype.uuid(),
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
          serialNumber: faker.datatype.uuid(),
        },
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
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal(
        'SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE (("name" ILIKE $1) OR ("name" ILIKE $2)) AND EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")=ANY($3::TEXT[]))',
      );
      params!.should.deep.equal(['product', 'Foo Bar', ['foo', 'bar']]);
    });
    it('should support call with chained where constraints - NOT ILIKE array of values', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
          sku: faker.datatype.uuid(),
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
          sku: faker.datatype.uuid(),
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().where({
        sku: {
          '!': {
            like: ['Foo', 'BAR'],
          },
        },
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE lower("sku")<>ALL($1::TEXT[])');
      params!.should.deep.equal([['foo', 'bar']]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.find().where({
          store: store.id,
        }),
      ]);
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained sort', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().sort('name asc');
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name"');
      params!.should.deep.equal([]);
    });
    it('should support call with chained limit', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().limit(42);
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 42');
      params!.should.deep.equal([]);
    });
    it('should support call with chained skip', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().skip(24);
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" OFFSET 24');
      params!.should.deep.equal([]);
    });
    it('should support call with chained paginate', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.find().paginate({
        page: 3,
        limit: 100,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 100 OFFSET 200');
      params!.should.deep.equal([]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
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
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      params!.should.deep.equal([store.id]);
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
      should.exist(result1);
      should.exist(result2);
      result1.should.deep.equal(result2);
      result1[0].instanceFunction().should.equal(`${result.name} bar!`);
      result2[0].instanceFunction().should.equal(`${result.name} bar!`);
    });
    it('should support retaining original field - UNSAFE_withOriginalFieldType()', async () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = 'Store';

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
      productResult.store.name?.should.equal(store.name);
    });
    describe('populate', () => {
      let store1: Store;
      let store2: Store;
      let product1: Product;
      let product2: Product;
      let product3: Product;
      let category1: Category;
      let category2: Category;
      let product1Category1: ProductCategory;
      let product1Category2: ProductCategory;
      let product2Category1: ProductCategory;
      let product3Category1: ProductCategory;

      let teacher1: Teacher;
      let teacher2: Teacher;
      let parkingSpace: ParkingSpace;
      let classroom: Classroom;
      let teacher1Classroom: TeacherClassroom;

      let source1: SimpleWithSelfReference;
      let source2: SimpleWithSelfReference;
      let translation1: SimpleWithSelfReference;
      let translation2: SimpleWithSelfReference;

      before(() => {
        store1 = new Store();
        store1.id = faker.datatype.number();
        store1.name = `store1 - ${store1.id}`;

        store2 = new Store();
        store2.id = faker.datatype.number();
        store2.name = `store2 - ${store2.id}`;

        product1 = new Product();
        product1.id = faker.datatype.number();
        product1.name = `product1 - ${product1.id}`;
        product1.store = store1.id;

        product2 = new Product();
        product2.id = faker.datatype.number();
        product2.name = `product2 - ${product2.id}`;
        product2.store = store2.id;

        product3 = new Product();
        product3.id = faker.datatype.number();
        product3.name = `product3 - ${product2.id}`;
        product3.store = store1.id;

        category1 = new Category();
        category1.id = faker.datatype.number();
        category1.name = `category1 - ${category1.id}`;

        category2 = new Category();
        category2.id = faker.datatype.number();
        category2.name = `category2 - ${category2.id}`;

        product1Category1 = new ProductCategory();
        product1Category1.id = faker.datatype.number();
        product1Category1.product = product1.id;
        product1Category1.category = category1.id;

        product1Category2 = new ProductCategory();
        product1Category2.id = faker.datatype.number();
        product1Category2.product = product1.id;
        product1Category2.category = category2.id;

        product2Category1 = new ProductCategory();
        product2Category1.id = faker.datatype.number();
        product2Category1.product = product2.id;
        product2Category1.category = category1.id;

        product3Category1 = new ProductCategory();
        product3Category1.id = faker.datatype.number();
        product3Category1.product = product3.id;
        product3Category1.category = category1.id;

        teacher1 = new Teacher();
        teacher1.id = faker.datatype.uuid();
        teacher1.firstName = faker.name.firstName();
        teacher1.lastName = faker.name.lastName();
        teacher1.isActive = true;

        teacher2 = new Teacher();
        teacher2.id = faker.datatype.uuid();
        teacher2.firstName = faker.name.firstName();
        teacher2.lastName = faker.name.lastName();
        teacher2.isActive = true;

        parkingSpace = new ParkingSpace();
        parkingSpace.id = faker.datatype.uuid();
        parkingSpace.name = faker.datatype.number().toString();

        teacher1.parkingSpace = parkingSpace.id;

        classroom = new Classroom();
        classroom.id = faker.datatype.uuid();
        classroom.name = faker.datatype.number().toString();

        teacher1Classroom = new TeacherClassroom();
        teacher1Classroom.id = faker.datatype.uuid();
        teacher1Classroom.teacher = teacher1.id;
        teacher1Classroom.classroom = classroom.id;

        source1 = new SimpleWithSelfReference();
        source1.id = faker.datatype.uuid();
        source1.name = 'Source';

        source2 = new SimpleWithSelfReference();
        source2.id = faker.datatype.uuid();
        source2.name = 'Source2';

        translation1 = new SimpleWithSelfReference();
        translation1.id = faker.datatype.uuid();
        translation1.name = 'translation1';
        translation1.source = source1.id;

        translation2 = new SimpleWithSelfReference();
        translation2.id = faker.datatype.uuid();
        translation2.name = 'translation2';
        translation2.source = source1.id;
      });

      it('should support populating a single relation - same/shared', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store')]),
          getQueryResult([_.pick(store1, 'id', 'name')]),
        );

        const results = await ProductRepository.find().populate('store');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name'),
            store: store1,
          },
          {
            ..._.pick(product3, 'id', 'name'),
            store: store1,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1');
        storeQueryParams!.should.deep.equal([store1.id]);
      });
      it('should support populating a single relation - different', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]),
          getQueryResult([
            // NOTE: Swapping the order to make sure that order doesn't matter
            _.pick(store2, 'id', 'name'),
            _.pick(store1, 'id', 'name'),
          ]),
        );

        const results = await ProductRepository.find().populate('store');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name'),
            store: store1,
          },
          {
            ..._.pick(product2, 'id', 'name'),
            store: store2,
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        storeQueryParams!.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating a single relation with partial select and sort', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]),
          getQueryResult([_.pick(store1, 'id'), _.pick(store2, 'id')]),
        );

        const results = await ProductRepository.find().populate('store', {
          select: ['id'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name'),
            store: _.pick(store1, 'id'),
          },
          {
            ..._.pick(product2, 'id', 'name'),
            store: _.pick(store2, 'id'),
          },
        ]);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id" FROM "stores" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        storeQueryParams!.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(store1, 'id', 'name'), _.pick(store2, 'id', 'name')]),
          getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]),
        );

        const results = await StoreRepository.find().populate('products');
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ..._.pick(store1, 'id', 'name'),
            products: [_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store')],
          },
          {
            ..._.pick(store2, 'id', 'name'),
            products: [_.pick(product2, 'id', 'name', 'store')],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=ANY($1::INTEGER[])');
        storeQueryParams!.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating one-to-many collection with partial select and sort', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(store1, 'id', 'name'), _.pick(store2, 'id', 'name')]),
          getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]),
        );

        const results = await StoreRepository.find().populate('products', {
          select: ['name', 'sku', 'store'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).twice();
        results.should.deep.equal([
          {
            ..._.pick(store1, 'id', 'name'),
            products: [_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store')],
          },
          {
            ..._.pick(store2, 'id', 'name'),
            products: [_.pick(product2, 'id', 'name', 'store')],
          },
        ]);
        results[0].products.length.should.equal(2);
        results[0].products[0].id.should.equal(product1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name" FROM "stores"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "name","sku","store_id" AS "store","id" FROM "products" WHERE "store_id"=ANY($1::INTEGER[]) ORDER BY "name"');
        storeQueryParams!.should.deep.equal([[store1.id, store2.id]]);
      });
      it('should support populating multi-multi collection', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([_.pick(category1, 'id', 'name'), _.pick(category2, 'id', 'name')]));

        const results = await ProductRepository.find().populate('categories');
        verify(mockedPool.query(anyString(), anything())).thrice();
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id', 'name'), _.pick(category2, 'id', 'name')],
          },
          {
            ..._.pick(product3, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id', 'name')],
          },
          {
            ..._.pick(product2, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id', 'name')],
          },
        ]);
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).second();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        productCategoryQueryParams!.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multi-multi collection with partial select and sort', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]))
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([_.pick(category1, 'id'), _.pick(category2, 'id')]));

        const results = await ProductRepository.find().populate('categories', {
          select: ['id'],
          sort: 'name',
        });
        verify(mockedPool.query(anyString(), anything())).thrice();
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id'), _.pick(category2, 'id')],
          },
          {
            ..._.pick(product3, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id')],
          },
          {
            ..._.pick(product2, 'id', 'name', 'store'),
            categories: [_.pick(category1, 'id')],
          },
        ]);
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).second();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        productCategoryQueryParams!.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
        categoryQuery.should.equal('SELECT "id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name"');
        categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
      });
      it('should support populating multiple properties', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([_.pick(product1, 'id', 'name', 'store'), _.pick(product3, 'id', 'name', 'store'), _.pick(product2, 'id', 'name', 'store')]))
          .thenResolve(
            getQueryResult([
              // NOTE: Swapping the order to make sure that order doesn't matter
              _.pick(store2, 'id', 'name'),
              _.pick(store1, 'id', 'name'),
            ]),
          )
          .thenResolve(getQueryResult([product1Category1, product1Category2, product2Category1, product3Category1]))
          .thenResolve(getQueryResult([_.pick(category1, 'id', 'name'), _.pick(category2, 'id', 'name')]));

        const results = await ProductRepository.find().populate('store').populate('categories');
        results.should.deep.equal([
          {
            ..._.pick(product1, 'id', 'name', 'store'),
            store: store1,
            categories: [_.pick(category1, 'id', 'name'), _.pick(category2, 'id', 'name')],
          },
          {
            ..._.pick(product3, 'id', 'name', 'store'),
            store: store1,
            categories: [_.pick(category1, 'id', 'name')],
          },
          {
            ..._.pick(product2, 'id', 'name', 'store'),
            store: store2,
            categories: [_.pick(category1, 'id', 'name')],
          },
        ]);
        verify(mockedPool.query(anyString(), anything())).times(4);
        results[0].store.id.should.equal(store1.id);
        results[0].categories.length.should.equal(2);
        results[0].categories[0].id.should.equal(category1.id);

        const [productQuery, productQueryParams] = capture(mockedPool.query).first();
        productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
        productQueryParams!.should.deep.equal([]);
        const [storeQuery, storeQueryParams] = capture(mockedPool.query).second();
        storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=ANY($1::INTEGER[])');
        storeQueryParams!.should.deep.equal([[store1.id, store2.id]]);
        const [productCategoryQuery, productCategoryQueryParams] = capture(mockedPool.query).third();
        productCategoryQuery.should.equal('SELECT "product_id" AS "product","category_id" AS "category","id" FROM "product__category" WHERE "product_id"=ANY($1::INTEGER[])');
        productCategoryQueryParams!.should.deep.equal([[product1.id, product3.id, product2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).last();
        categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
        categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);

        const boxedResults = results as QueryResultPopulated<Product, 'categories' | 'store'>[];
        boxedResults[0].store.id.should.equal(store1.id);
      });
      it('should support populating multiple properties with partial select and sort', async () => {
        when(mockedPool.query(anyString(), anything()))
          .thenResolve(getQueryResult([_.pick(teacher1, 'id', 'firstName', 'lastName', 'isActive', 'parkingSpace'), _.pick(teacher2, 'id', 'firstName', 'lastName', 'isActive', 'parkingSpace')]))
          .thenResolve(getQueryResult([_.pick(parkingSpace, 'id', 'name')]))
          .thenResolve(getQueryResult([teacher1Classroom]))
          .thenResolve(getQueryResult([_.pick(classroom, 'id', 'name')]));

        async function getTeachers(): Promise<QueryResultPopulated<Teacher, 'classrooms' | 'parkingSpace'>[]> {
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
            ..._.pick(teacher1, 'id', 'firstName', 'lastName', 'isActive'),
            parkingSpace: _.pick(parkingSpace, 'id', 'name'),
            classrooms: [_.pick(classroom, 'id', 'name')],
          },
          {
            ..._.pick(teacher2, 'id', 'firstName', 'lastName', 'isActive'),
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
        teacherQueryParams!.should.deep.equal([true]);
        const [parkingSpaceQuery, parkingSpaceQueryParams] = capture(mockedPool.query).second();
        parkingSpaceQuery.should.equal('SELECT "name","id" FROM "parking_space" WHERE "id"=$1');
        parkingSpaceQueryParams!.should.deep.equal([parkingSpace.id]);
        const [teacherClassroomQuery, teacherClassroomQueryParams] = capture(mockedPool.query).third();
        teacherClassroomQuery.should.equal('SELECT "teacher_id" AS "teacher","classroom_id" AS "classroom","id" FROM "teacher__classroom" WHERE "teacher_id"=ANY($1::TEXT[])');
        teacherClassroomQueryParams!.should.deep.equal([[teacher1.id, teacher2.id]]);
        const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).last();
        categoryQuery.should.equal('SELECT "name","id" FROM "classroom" WHERE "id"=$1 AND "name" ILIKE $2');
        categoryQueryParams!.should.deep.equal([classroom.id, 'classroom%']);
      });
      it('should support populating self reference', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(source1, 'id', 'name'), _.pick(source2, 'id', 'name')]),
          getQueryResult([_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')]),
        );

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
            ..._.pick(source1, 'id', 'name'),
            translations: [_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')],
          },
          {
            ..._.pick(source2, 'id', 'name'),
            translations: [],
          },
        ]);
        results[0].translations.length.should.equal(2);
        results[0].translations[0].id.should.equal(translation1.id);

        const [sourceQuery, sourceQueryParams] = capture(mockedPool.query).first();
        sourceQuery.should.equal('SELECT "name","id" FROM "simple" WHERE "source_id" IS NULL');
        sourceQueryParams!.should.deep.equal([]);
        const [translationsQuery, translationsQueryParams] = capture(mockedPool.query).second();
        translationsQuery.should.equal('SELECT "id","name","source_id" AS "source" FROM "simple" WHERE "source_id"=ANY($1::TEXT[])');
        translationsQueryParams!.should.deep.equal([[source1.id, source2.id]]);
      });
      it('should support populating self reference and not explicitly selecting relation column', async () => {
        when(mockedPool.query(anyString(), anything())).thenResolve(
          getQueryResult([_.pick(source1, 'id', 'name'), _.pick(source2, 'id', 'name')]),
          getQueryResult([_.pick(translation1, 'id', 'name', 'source'), _.pick(translation2, 'id', 'name', 'source')]),
        );

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
          (ex as Error).message.should.equal('Unable to populate "translations" on SimpleWithSelfReference. "source" is not included in select array.');
        }
      });
    });
  });
  describe('#count()', () => {
    it('should support call without constraints', async () => {
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            count: products.length,
          },
        ]),
      );

      const result = await ProductRepository.count();
      should.exist(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products"');
      params!.should.deep.equal([]);
    });
    it('should support call constraints as a parameter', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
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
      should.exist(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      params!.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
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
      should.exist(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };
      const products = [
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
        {
          id: faker.datatype.number(),
          name: `product - ${faker.datatype.uuid()}`,
        },
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
      should.exist(result);
      result.should.equal(products.length);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
  });
});
