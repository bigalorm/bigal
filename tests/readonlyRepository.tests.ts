import assert from 'assert';

import chai from 'chai';
import * as faker from 'faker';
import _ from 'lodash';
import type { QueryResult } from 'pg';
import { Pool } from 'postgres-pool';
import { anyString, anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';

import type { Repository, ReadonlyRepository, QueryResponsePopulated, NotEntity } from '../src';
import { initialize } from '../src';

import type { IJsonLikeEntity } from './models';
import { Category, KitchenSink, Product, ProductCategory, ReadonlyProduct, SimpleWithJson, SimpleWithRelationAndJson, Store } from './models';

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let ProductRepository: Repository<Product>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let ReadonlyProductRepository: ReadonlyRepository<ReadonlyProduct>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let ReadonlyKitchenSinkRepository: ReadonlyRepository<KitchenSink>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let StoreRepository: Repository<Store>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let SimpleWithJsonRepository: Repository<SimpleWithJson>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let SimpleWithRelationAndJsonRepository: Repository<SimpleWithRelationAndJson>;

  before(() => {
    should = chai.should();

    const repositoriesByModelName = initialize({
      models: [Category, KitchenSink, Product, ProductCategory, ReadonlyProduct, SimpleWithJson, SimpleWithRelationAndJson, Store],
      pool: instance(mockedPool),
    });

    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ReadonlyProductRepository = repositoriesByModelName.ReadonlyProduct as ReadonlyRepository<ReadonlyProduct>;
    ReadonlyKitchenSinkRepository = repositoriesByModelName.KitchenSink as ReadonlyRepository<KitchenSink>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
    SimpleWithJsonRepository = repositoriesByModelName.SimpleWithJson as Repository<SimpleWithJson>;
    SimpleWithRelationAndJsonRepository = repositoriesByModelName.SimpleWithRelationAndJson as Repository<SimpleWithRelationAndJson>;
  });

  beforeEach(() => {
    reset(mockedPool);
  });

  describe('#findOne()', () => {
    it('should support call without constraints', async () => {
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
      product.id = faker.random.number();
      product.name = `product - ${faker.random.uuid()}`;

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
      productStore.id = faker.random.number();
      productStore.name = `store - ${faker.random.uuid()}`;

      const product = new Product();
      product.id = faker.random.number();
      product.name = `product - ${faker.random.uuid()}`;
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        const id = faker.random.number();
        const name = faker.random.uuid();
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1');
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating a single relation with partial select and order', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
      storeQuery.should.equal('SELECT "name","id" FROM "stores" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating collection', async () => {
      const store = new Store();
      store.id = faker.random.number();
      store.name = `store - ${faker.random.uuid()}`;

      const product1 = new Product();
      product1.id = faker.random.number();
      product1.name = `product - ${faker.random.uuid()}`;
      product1.store = store.id;

      const product2 = new Product();
      product2.id = faker.random.number();
      product2.name = `product - ${faker.random.uuid()}`;
      product2.store = store.id;

      const storeWithProducts: QueryResponsePopulated<Store, 'products'> = {
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product1 = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        store: store.id,
      };
      const product2 = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      };
      const category1 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const category2 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.random.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.random.number(),
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
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support populating multi-multi collection with partial select and order', async () => {
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      };
      const category1 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const category2 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.random.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.random.number(),
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
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "name","id" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) ORDER BY "name" DESC');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id]]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        store: store.id,
      };
      const category1 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const category2 = {
        id: faker.random.number(),
        name: `category - ${faker.random.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.random.number(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.random.number(),
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
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 AND "name" ILIKE $2 LIMIT 1');
      storeQueryParams!.should.deep.equal([store.id, 'store%']);
      const [productCategoryMapQuery, productCategoryMapQueryParams] = capture(mockedPool.query).third();
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [categoryQuery, categoryQueryParams] = capture(mockedPool.query).byCallIndex(3);
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      categoryQueryParams!.should.deep.equal([[category1.id, category2.id], 'category%']);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const result = {
        id: faker.random.number(),
        name: `sink - ${faker.random.uuid()}`,
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
    it('should support an object with a json field', async () => {
      const simple = {
        id: faker.random.number(),
        name: `simple - ${faker.random.uuid()}`,
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
      store.id = faker.random.number();
      store.name = `store - ${faker.random.uuid()}`;

      const simple = new SimpleWithRelationAndJson();
      simple.id = faker.random.number();
      simple.name = `simple - ${faker.random.uuid()}`;
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
      store.id = faker.random.number();
      store.name = `store - ${faker.random.uuid()}`;

      const simple = new SimpleWithRelationAndJson();
      simple.id = faker.random.number();
      simple.name = `simple - ${faker.random.uuid()}`;
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
  });
  describe('#find()', () => {
    it('should support call without constraints', async () => {
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
          serialNumber: faker.random.uuid(),
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
          serialNumber: faker.random.uuid(),
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
          sku: faker.random.uuid(),
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
          sku: faker.random.uuid(),
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `sink - ${faker.random.uuid()}`,
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
  });
  describe('#count()', () => {
    it('should support call without constraints', async () => {
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
        },
        {
          id: faker.random.number(),
          name: `product - ${faker.random.uuid()}`,
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
