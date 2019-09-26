/*import chai from 'chai';
import * as _ from 'lodash';
import * as faker from 'faker';
import { Pool } from 'postgres-pool';
import {
 anyString, anything, instance, mock, when, reset, capture, verify,
} from 'ts-mockito';
import {
  initialize,
  Entity,
  ReadonlyRepository,
  Repository,
} from '../src';
import {Store} from "./models/Store";
import {Product} from "./models/Product";
import {ReadonlyProduct} from "./models/ReadonlyProduct";

function getQueryResult(rows: any[] = []) {
  return {
    command: 'select',
    rowCount: 1,
    oid: 1,
    fields: [],
    rows,
  };
}

describe('model', () => {
  let should: Chai.Should;
  const mockedPool: Pool = mock(Pool);

  before(() => {
    should = chai.should();
  });

  let ProductRepository: Repository<Product>;
  let ReadonlyProductRepository: ReadonlyRepository<ReadonlyProduct>;
  let StoreRepository: Repository<Store>;

  beforeEach(async () => {
    reset(mockedPool);

    const repositories = await initialize({
      pool: instance(mockedPool),
    });
    for (const [name, repository] of Object.entries(repositories)) {
      switch (name) {
        case 'Product':
          ProductRepository = repository as Repository<Product>;
          break;
        case 'ReadonlyProduct':
          ReadonlyProductRepository = repository as ReadonlyRepository<ReadonlyProduct>;
          break;
        case 'Store':
          StoreRepository = repository as Repository<Store>;
          break;
        default:
          // Skip other repositories that are not used here
          break;
      }
    }
  });

  describe('#findOne()', () => {
    it('should support call without constraints', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      const result = await ProductRepository.findOne();
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" LIMIT 1');
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
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

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "name","id" FROM "product" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().where({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const product = {
        id: faker.random.uuid(),
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
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained sort', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.findOne().sort('name asc');
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" ORDER BY "name" LIMIT 1');
      params!.should.deep.equal([]);
    });
    describe('Parse number columns', () => {
      it('should parse integer columns return as integer strings', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'integer',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should parse integer columns return as float strings', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'integer',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: 42,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should parse integer columns return as number', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'integer',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const numberValue = 42;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: numberValue,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should ignore large integer columns', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'integer',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0`;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: largeNumberValue,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: largeNumberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should parse float columns return as float strings', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'float',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: `${numberValue}`,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should parse float columns return as number', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'float',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const numberValue = 42.24;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: numberValue,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: numberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
      it('should ignore large float columns', async () => {
        const schema: ModelSchema = {
          globalId: faker.random.uuid(),
          tableName: faker.random.uuid(),
          attributes: {
            id: {
              type: 'integer',
              primaryKey: true,
            },
            foo: {
              type: 'float',
            },
          },
        };


        let Model: Repository<Entity>;
        initializeModelClasses({
          modelSchemas: [schema],
          pool: instance(mockedPool),
          expose(model: Repository<Entity>) {
            Model = model;
          },
        });

        const id = faker.random.uuid();
        const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0.42`;
        when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([{
          id,
          foo: largeNumberValue,
        }]));

        const result = await Model!.findOne();
        should.exist(result);
        result!.should.deep.equal({
          id,
          foo: largeNumberValue,
        });

        const [
          query,
          params,
        ] = capture(mockedPool.query).first();
        query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
        params!.should.deep.equal([]);
      });
    });
    it('should support populating a single relation', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product = {
        id: faker.random.uuid(),
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
      result!.should.deep.equal(product);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "store" WHERE "id"=$1 LIMIT 1');
      storeQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating collection', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product1 = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: store.id,
      };
      const product2 = {
        id: faker.random.uuid(),
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
      result!.should.deep.equal(storeWithProducts);

      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).first();
      storeQuery.should.equal('SELECT "id","name" FROM "store" LIMIT 1');
      storeQueryParams!.should.deep.equal([]);
      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).second();
      productQuery.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
      productQueryParams!.should.deep.equal([store.id]);
    });
    it('should support populating multi-multi collection', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };
      const category1 = {
        id: faker.random.uuid(),
        name: `category - ${faker.random.uuid()}`,
      };
      const category2 = {
        id: faker.random.uuid(),
        name: `category - ${faker.random.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.random.uuid(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.random.uuid(),
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
      result!.should.deep.equal(productWithCategories);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" LIMIT 1');
      productQueryParams!.should.deep.equal([]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = capture(mockedPool.query).second();
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = capture(mockedPool.query).third();
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1::TEXT[])');
      categoryQueryParams!.should.deep.equal([
        [category1.id, category2.id],
      ]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: store.id,
      };
      const category1 = {
        id: faker.random.uuid(),
        name: `category - ${faker.random.uuid()}`,
      };
      const category2 = {
        id: faker.random.uuid(),
        name: `category - ${faker.random.uuid()}`,
      };
      const productCategory1Map = {
        id: faker.random.uuid(),
        product: product.id,
        category: category1.id,
      };
      const productCategory2Map = {
        id: faker.random.uuid(),
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
      result!.should.deep.equal(fullProduct);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      productQueryParams!.should.deep.equal([store.id]);
      const [
        storeQuery,
        storeQueryParams,
      ] = capture(mockedPool.query).second();
      storeQuery.should.equal('SELECT "id","name" FROM "store" WHERE "id"=$1 LIMIT 1');
      storeQueryParams!.should.deep.equal([store.id]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = capture(mockedPool.query).third();
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams!.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = capture(mockedPool.query).byCallIndex(3);
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1::TEXT[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      categoryQueryParams!.should.deep.equal([
        [category1.id, category2.id],
        'category%',
      ]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'string',
          },
          toBar() {
            return `${this.foo} bar!`;
          },
        },
      };


      let Model: Repository<Entity>;
      initializeModelClasses({
        modelSchemas: [schema],
        pool: instance(mockedPool),
        expose(model: Repository<Entity>) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const foo = faker.random.uuid();
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          id,
          foo,
        }]),
      );

      const result1 = await Model!.findOne();
      const result2 = await Model!.findOne();

      verify(mockedPool.query(anyString(), anything())).twice();

      should.exist(result1);
      result1!.should.deep.equal(result2);
      result1!.toBar().should.equal(`${foo} bar!`);
      should.exist(result2);
      result2!.toBar().should.equal(`${foo} bar!`);
    });
    it('should not create an object/assign instance functions to null results', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'string',
          },
          toBar() {
            return `${this.foo} bar!`;
          },
        },
      };


      let Model: Repository<Entity>;
      initializeModelClasses({
        modelSchemas: [schema],
        pool: instance(mockedPool),
        expose(model: Repository<Entity>) {
          Model = model;
        },
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([null]),
      );

      const result = await Model!.findOne();

      verify(mockedPool.query(anyString(), anything())).once();

      should.not.exist(result);
    });
  });
  describe('#find()', () => {
    it('should support call without constraints', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product"');
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "name","id" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2');
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - array ILIKE array of values', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        serialNumber: faker.random.uuid(),
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE (("name" ILIKE $1) OR ("name" ILIKE $2)) AND EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")=ANY($3::TEXT[]))');
      params!.should.deep.equal([
        'product',
        'Foo Bar',
        ['foo', 'bar'],
      ]);
    });
    it('should support call with chained where constraints - NOT ILIKE array of values', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        serialNumber: faker.random.uuid(),
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        serialNumber: faker.random.uuid(),
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );
      const result = await ProductRepository.find().where({
        serialNumber: {
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE lower("serial_number")<>ALL($1::TEXT[])');
      params!.should.deep.equal([['foo', 'bar']]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained sort', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" ORDER BY "name"');
      params!.should.deep.equal([]);
    });
    it('should support call with chained limit', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" LIMIT 42');
      params!.should.deep.equal([]);
    });
    it('should support call with chained skip', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" OFFSET 24');
      params!.should.deep.equal([]);
    });
    it('should support call with chained paginate', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" LIMIT 100 OFFSET 200');
      params!.should.deep.equal([]);
    });
    it('should support complex query with multiple chained modifiers', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      params!.should.deep.equal([store.id]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'string',
          },
          toBar() {
            return `${this.foo} bar!`;
          },
        },
      };


      let Model: Repository<Entity>;
      initializeModelClasses({
        modelSchemas: [schema],
        pool: instance(mockedPool),
        expose(model: Repository<Entity>) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const foo = faker.random.uuid();
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          id,
          foo,
        }]),
      );

      const result1 = await Model!.find();
      const result2 = await Model!.find();
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result1);
      should.exist(result2);
      result1.should.deep.equal(result2);
      result1![0].toBar().should.equal(`${foo} bar!`);
      result2![0].toBar().should.equal(`${foo} bar!`);
    });
  });
  describe('#count()', () => {
    it('should support call without constraints', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT count(*) AS "count" FROM "product"');
      params!.should.deep.equal([]);
    });
    it('should support call constraints as a parameter', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2');
      params!.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should support call with chained where constraints', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints - Promise.all', async () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
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
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
  });
});
*/
