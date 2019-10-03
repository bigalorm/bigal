import chai from 'chai';
import _ from 'lodash';
import * as faker from 'faker';
import { Pool } from 'postgres-pool';
import {
  anyString,
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito';
import {
  initialize,
  Entity,
  ReadonlyRepository,
  Repository,
} from '../src';
import {
  Category,
  Product,
  ProductCategory,
  ReadonlyProduct,
  Store,
} from './models';
import { ColumnTypeMetadata, ModelMetadata } from '../src/metadata';
import { RepositoriesByModelNameLowered } from '../src/RepositoriesByModelNameLowered';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getQueryResult(rows: any[] = []) {
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
  let ProductRepository: Repository<Product>;
  let ReadonlyProductRepository: ReadonlyRepository<ReadonlyProduct>;
  let StoreRepository: Repository<Store>;

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class TestEntity implements Entity {
  }

  before(() => {
    should = chai.should();

    const repositoriesByModelName = initialize({
      models: [
        Category,
        Product,
        ProductCategory,
        ReadonlyProduct,
        Store,
      ],
      pool: instance(mockedPool),
    });

    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ReadonlyProductRepository = repositoriesByModelName.ReadonlyProduct as ReadonlyRepository<ReadonlyProduct>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
  });

  beforeEach(async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "readonly_products" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([product.id]);
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const product = {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const [
        result,
      ] = await Promise.all([
        ProductRepository.findOne().where({
          id: product.id,
        }),
      ]);
      should.exist(result);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=$1 LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    describe('Parse number columns', () => {
      it('should parse integer columns from integer query value', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'integer',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await repository.findOne();
        should.exist(result);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should parse integer columns from float strings query value', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'integer',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: 42,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should parse integer columns that return as number', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'integer',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: numberValue,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should ignore large integer columns values', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'integer',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0`;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: largeNumberValue,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: largeNumberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should parse float columns return as float strings', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'float',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should parse float columns return as number', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'float',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: numberValue,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params!.should.deep.equal([]);
      });
      it('should ignore large float columns', async () => {
        const model = new ModelMetadata({
          name: 'foo',
          type: TestEntity,
        });
        model.columns = [
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'id',
            propertyName: 'id',
            primary: true,
            type: 'integer',
          }),
          new ColumnTypeMetadata({
            target: 'foo',
            name: 'foo',
            propertyName: 'foo',
            type: 'float',
          }),
        ];
        const repositories: RepositoriesByModelNameLowered = {};
        const repository = new ReadonlyRepository({
          modelMetadata: model,
          type: model.type,
          pool: instance(mockedPool),
          repositoriesByModelNameLowered: repositories,
        });
        repositories[model.name.toLowerCase()] = repository;

        const id = faker.random.number();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0.42`;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: largeNumberValue,
        }]));

        const result = await repository.findOne();
        should.exist(result);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.should.deep.equal({
          id,
          foo: largeNumberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${model.tableName}" LIMIT 1`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        getQueryResult([{
          id: product.id,
          name: product.name,
          store: store.id,
        }]),
        getQueryResult([store]),
      );

      const result = await ProductRepository.findOne().populate('store');
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(product);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      productQueryParams!.should.deep.equal([]);
      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating collection', async () => {
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

      const storeWithProducts = _.extend({
        products: [product1, product2],
      }, store);

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([store]),
        getQueryResult([product1, product2]),
      );

      const result = await StoreRepository.findOne().populate('products');
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(storeWithProducts);

      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      storeQueryParams!.should.deep.equal([]);
      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

      const productWithCategories = _.extend({
        categories: [category1, category2],
      }, product);

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
        getQueryResult([productCategory1Map, productCategory2Map]),
        getQueryResult([category1, category2]),
      );

      const result = await ProductRepository.findOne().populate('categories');
      verify(mockedPool.query(anyString(), anything())).thrice();
      should.exist(result);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(productWithCategories);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      productQueryParams!.should.deep.equal([]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[])');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      categoryQueryParams!.should.deep.equal([
        [category1.id, category2.id],
      ]);
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

      const fullProduct = _.defaults({
        store,
        categories: [category1, category2],
      }, product);

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
        .populate('store')
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result!.should.deep.equal(fullProduct);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      productQueryParams!.should.deep.equal([store.id]);
      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      storeQueryParams!.should.deep.equal([store.id]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = capture(mockedPool.query).third();
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = capture(mockedPool.query).byCallIndex(3);
      categoryQuery.should.equal('SELECT "id","name" FROM "categories" WHERE "id"=ANY($1::INTEGER[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      categoryQueryParams!.should.deep.equal([
        [category1.id, category2.id],
        'category%',
      ]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      // eslint-disable-next-line max-classes-per-file
      class TestEntityWithInstanceFunction implements Entity {
        public id!: number;

        public foo: string | undefined;

        public toBar() {
          return `${this.foo} bar!`;
        }
      }
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntityWithInstanceFunction,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      const repository = new ReadonlyRepository({
        modelMetadata: model,
        type: model.type,
        pool: instance(mockedPool),
        repositoriesByModelNameLowered: repositories,
      });
      repositories[model.name.toLowerCase()] = repository;

      const id = faker.random.number();
      const foo = faker.random.uuid();
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          id,
          foo,
        }]),
      );

      const result1 = await repository.findOne();
      const result2 = await repository.findOne();

      verify(mockedPool.query(anyString(), anything())).twice();

      should.exist(result1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result1!.should.deep.equal(result2);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result1!.toBar().should.equal(`${foo} bar!`);
      should.exist(result2);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result2!.toBar().should.equal(`${foo} bar!`);
    });
    it('should not create an object/assign instance functions to null results', async () => {
      // eslint-disable-next-line max-classes-per-file
      class TestEntityWithInstanceFunction implements Entity {
        public id!: number;

        public foo: string | undefined;

        public toBar() {
          return `${this.foo} bar!`;
        }
      }
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntityWithInstanceFunction,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      const repository = new ReadonlyRepository({
        modelMetadata: model,
        type: model.type,
        pool: instance(mockedPool),
        repositoriesByModelNameLowered: repositories,
      });
      repositories[model.name.toLowerCase()] = repository;

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([null]),
      );

      const result = await repository.findOne();

      verify(mockedPool.query(anyString(), anything())).once();

      should.not.exist(result);
    });
  });
  describe('#find()', () => {
    it('should support call without constraints', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find();
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products"');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
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

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().where({
        store: store.id,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - array ILIKE array of values', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        serialNumber: faker.random.uuid(),
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        serialNumber: faker.random.uuid(),
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().where({
        or: [{
          name: {
            like: 'product',
          },
        }, {
          name: {
            like: 'Foo Bar',
          },
        }],
        aliases: {
          like: ['Foo', 'BAR'],
        },
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE (("name" ILIKE $1) OR ("name" ILIKE $2)) AND EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")=ANY($3::TEXT[]))');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([
        'product',
        'Foo Bar',
        ['foo', 'bar'],
      ]);
    });
    it('should support call with chained where constraints - NOT ILIKE array of values', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        sku: faker.random.uuid(),
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
        sku: faker.random.uuid(),
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().where({
        sku: {
          '!': {
            like: ['Foo', 'BAR'],
          },
        },
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE lower("sku")<>ALL($1::TEXT[])');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([['foo', 'bar']]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const [
        result,
      ] = await Promise.all([
        ProductRepository.find().where({
          store: store.id,
        }),
      ]);
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained sort', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().sort('name asc');
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "name"');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support call with chained limit', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().limit(42);
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 42');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support call with chained skip', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().skip(24);
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" OFFSET 24');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support call with chained paginate', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().paginate({
        page: 3,
        limit: 100,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" LIMIT 100 OFFSET 200');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );

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

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([store.id]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      // eslint-disable-next-line max-classes-per-file
      class TestEntityWithInstanceFunction implements Entity {
        public id!: number;

        public foo: string | undefined;

        public toBar() {
          return `${this.foo} bar!`;
        }
      }
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntityWithInstanceFunction,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      const repository = new ReadonlyRepository({
        modelMetadata: model,
        type: model.type,
        pool: instance(mockedPool),
        repositoriesByModelNameLowered: repositories,
      });
      repositories[model.name.toLowerCase()] = repository;

      const id = faker.random.number();
      const foo = faker.random.uuid();
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          id,
          foo,
        }]),
      );

      const result1 = await repository.find();
      const result2 = await repository.find();
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result1);
      should.exist(result2);
      result1.should.deep.equal(result2);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result1![0].toBar().should.equal(`${foo} bar!`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result2![0].toBar().should.equal(`${foo} bar!`);
    });
  });
  describe('#count()', () => {
    it('should support call without constraints', async () => {
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          count: products.length,
        }]),
      );

      const result = await ProductRepository.count();
      should.exist(result);
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products"');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([]);
    });
    it('should support call constraints as a parameter', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          count: products.length,
        }]),
      );

      const result = await ProductRepository.count({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          count: products.length,
        }]),
      );

      const result = await ProductRepository.count().where({
        store: store.id,
      });
      should.exist(result);
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.random.number(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.number(),
        name: `product - ${faker.random.uuid()}`,
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          count: products.length,
        }]),
      );

      const [
        result,
      ] = await Promise.all([
        ProductRepository.count().where({
          store: store.id,
        }),
      ]);
      should.exist(result);
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "products" WHERE "store_id"=$1');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params!.should.deep.equal([store.id]);
    });
  });
});
