// @ts-ignore
import chai from 'chai';
import * as _ from 'lodash';
import * as faker from 'faker';
import { ModelSchema } from '../src/schema/ModelSchema';
import { Repository } from '../src/Repository';
import { Entity } from '../src/Entity';
import { initialize as initializeModelClasses } from '../src';
import { Pool } from 'postgres-pool';
import { anyString, anything, instance, mock, when, reset, capture, verify } from 'ts-mockito';

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

  const storeSchema: ModelSchema = {
    globalId: 'store',
    tableName: 'store',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
      products: {
        collection: 'product',
        via: 'store',
      },
    },
  };
  const productSchema: ModelSchema = {
    globalId: 'product',
    tableName: 'product',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
      store: {
        model: 'store',
        columnName: 'store_id',
      },
      categories: {
        collection: 'category',
        via: 'product',
        through: 'productCategory',
      },
    },
  };
  const categorySchema: ModelSchema = {
    globalId: 'category',
    tableName: 'category',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
      products: {
        collection: 'product',
        via: 'category',
        through: 'productCategory',
      },
    },
  };
  const productCategorySchema: ModelSchema = {
    globalId: 'productCategory',
    tableName: 'product__category',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      product: {
        model: 'product',
        columnName: 'product_id',
      },
      category: {
        model: 'category',
        columnName: 'category_id',
      },
    },
  };
  const schemas: ModelSchema[] = [
    storeSchema,
    productSchema,
    categorySchema,
    productCategorySchema,
  ];

  // tslint:disable-next-line:variable-name
  let Product: Repository<Entity>;
  // tslint:disable-next-line:variable-name
  let Store: Repository<Entity>;
  beforeEach(() => {
    reset(mockedPool);

    initializeModelClasses({
      modelSchemas: schemas,
      pool: instance(mockedPool),
      expose(model: Repository<Entity>, schema: ModelSchema) {
        switch (schema.globalId) {
          case 'product':
            Product = model;
            break;
          case 'store':
            Store = model;
            break;
          default:
            break;
        }
      },
    });
  });

  describe('#findOne()', () => {
    it('should support call without constraints', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));
      const result = await Product.findOne();
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
      params!.should.deep.equal([]);
    });
    it('should support call with constraints as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await Product.findOne({
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

      const result = await Product.findOne({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await Product.findOne().where({
        id: product.id,
      });
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params!.should.deep.equal([product.id]);
    });
    it('should support call with chained sort', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await Product.findOne().sort('name asc');
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" ORDER BY "name" LIMIT 1');
      params!.should.deep.equal([]);
    });
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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

      const result = await Product.findOne().populate('store');
      verify(mockedPool.query(anyString(), anything())).twice();
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
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

      const result = await Store.findOne().populate('products');
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
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
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

      const result = await Product.findOne().populate('categories');
      verify(mockedPool.query(anyString(), anything())).thrice();
      should.exist(result);
      result!.should.deep.equal(productWithCategories);

      const [
        productQuery,
        productQueryParams,
      ] = capture(mockedPool.query).first();
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
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

      const result = await Product.findOne()
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
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
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

      // tslint:disable-next-line:variable-name
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

      // tslint:disable-next-line:variable-name
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
      const result = await Product.find();
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product"');
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
      const result = await Product.find({
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
      result!.should.deep.equal(products);

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
      const result = await Product.find({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2');
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
      const result = await Product.find().where({
        store: store.id,
      });
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
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
      const result = await Product.find().sort('name asc');
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" ORDER BY "name"');
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
      const result = await Product.find().limit(42);
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 42');
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
      const result = await Product.find().skip(24);
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" OFFSET 24');
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
      const result = await Product.find().paginate({
        page: 3,
        limit: 100,
      });
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 100 OFFSET 200');
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

      const result = await Product.find()
        .where({
          store: store.id,
        })
        .skip(24)
        .limit(42)
        .sort('store desc');

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
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

      // tslint:disable-next-line:variable-name
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
      result1!.should.deep.equal(result2);
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

      const result = await Product.count();
      should.exist(result);
      result!.should.equal(products.length);

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

      const result = await Product.count({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result!.should.equal(products.length);

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

      const result = await Product.count().where({
        store: store.id,
      });
      should.exist(result);
      result!.should.equal(products.length);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "store_id"=$1');
      params!.should.deep.equal([store.id]);
    });
  });
  describe('#create()', () => {
    it('should execute beforeCreate if defined as a schema method', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'boolean',
          },
          bar: {
            type: 'boolean',
          },
        },
        async beforeCreate(values) {
          // tslint:disable-next-line:no-shadowed-variable
          return _.merge(values, {
            calledCreate: true,
            bar: true,
          });
        },
      };

      // tslint:disable-next-line:variable-name
      let Model: Repository<Entity>;
      initializeModelClasses({
        modelSchemas: [schema],
        pool: instance(mockedPool),
        expose(model: Repository<Entity>) {
          Model = model;
        },
      });

      interface ValueType {
        id: number;
        calledCreate?: boolean;
        calledUpdate?: boolean;
        foo?: boolean;
        bar?: boolean;
      }

      const values: ValueType = {
        id: 42,
      };
      await Model!.create(values);

      values.should.deep.equal({
        id: 42,
        calledCreate: true,
        bar: true,
      });
    });
    it('should return single object result if single value is specified', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const result = await Product.create({
        name: product.name,
        store: product.store,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result!.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$2) RETURNING "id","name","store_id" AS "store"');
      params!.should.deep.equal([
        product.name,
        product.store,
      ]);
    });
    it('should return true if single value is specified and returnRecords=false', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const result = await Product.create({
        name: product.name,
        store: product.store,
      }, {
        returnRecords: false,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result!.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$2)');
      params!.should.deep.equal([
        product.name,
        product.store,
      ]);
    });
    it('should return empty array results if empty value array is specified', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([]),
      );

      const result = await Product.create([]);

      verify(mockedPool.query(anyString(), anything())).never();
      should.exist(result);
      result!.should.deep.equal([]);
    });
    it('should return object array results if multiple values are specified', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );

      const result = await Product.create(products.map((product) => {
        return {
          name: product.name,
          store: product.store,
        };
      }));

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$3),($2,$4) RETURNING "id","name","store_id" AS "store"');
      params!.should.deep.equal([
        products[0].name,
        products[1].name,
        products[0].store,
        products[1].store,
      ]);
    });
    it('should return true if multiple values are specified and returnRecords=false', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      }];

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );

      const result = await Product.create(products.map((product) => {
        return {
          name: product.name,
          store: product.store,
        };
      }), {
        returnRecords: false,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$3),($2,$4)');
      params!.should.deep.equal([
        products[0].name,
        products[1].name,
        products[0].store,
        products[1].store,
      ]);
    });
  });
  describe('#update()', () => {
    it('should execute beforeUpdate if defined as a schema method', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'boolean',
          },
          bar: {
            type: 'boolean',
          },
        },
        async beforeUpdate(values) {
          // tslint:disable-next-line:no-shadowed-variable
          return _.merge(values, {
            calledUpdate: true,
            bar: true,
          });
        },
      };

      // tslint:disable-next-line:variable-name
      let Model: Repository<Entity>;
      initializeModelClasses({
        modelSchemas: [schema],
        pool: instance(mockedPool),
        expose(model: Repository<Entity>) {
          Model = model;
        },
      });

      interface ValueType {
        id: number;
        calledCreate?: boolean;
        calledUpdate?: boolean;
        foo?: boolean;
        bar?: boolean;
      }

      const values: ValueType = {
        id: 42,
      };
      await Model!.update({
        id: faker.random.uuid(),
      }, values);

      values.should.deep.equal({
        id: 42,
        bar: true,
        calledUpdate: true,
      });
    });
    it('should return array of updated objects if second parameter is not defined', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const result = await Product.update({
        id: product.id,
      }, {
        name: product.name,
        store: product.store,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.deep.equal([product]);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","store_id" AS "store"');
      params!.should.deep.equal([
        product.name,
        product.store,
        product.id,
      ]);
    });
    it('should return true if returnRecords=false', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const result = await Product.update({
        id: product.id,
      }, {
        name: product.name,
        store: product.store,
      }, {
        returnRecords: false,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3');
      params!.should.deep.equal([
        product.name,
        product.store,
        product.id,
      ]);
    });
  });
  describe('#destroy()', () => {
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

      const result = await Product.destroy();
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" RETURNING "id","name","store_id" AS "store"');
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
        getQueryResult(products),
      );

      const result = await Product.destroy({
        id: _.map(products, 'id'),
        store,
      });
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2 RETURNING "id","name","store_id" AS "store"');
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
      const result = await Product.destroy().where({
        store: store.id,
      });
      should.exist(result);
      result!.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "store_id"=$1 RETURNING "id","name","store_id" AS "store"');
      params!.should.deep.equal([store.id]);
    });
    it('should return true if returnRecords=false', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const result = await Product.destroy({
        id: product.id,
      }, {
        returnRecords: false,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result!.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "id"=$1');
      params!.should.deep.equal([
        product.id,
      ]);
    });
  });
});
