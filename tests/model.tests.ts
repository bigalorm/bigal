'use strict';

const _ = require('lodash');
const faker = require('faker');
const sinon = require('sinon');
const should = require('chai').should();

const {
  initialize: initializeModelClasses,
} = require('../index');

describe('model', () => {
  const storeSchema = {
    globalId: 'store',
    tableName: 'store',
    attributes: {
      id: {
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
  const productSchema = {
    globalId: 'product',
    tableName: 'product',
    attributes: {
      id: {
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
  const categorySchema = {
    globalId: 'category',
    tableName: 'category',
    attributes: {
      id: {
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
  const productCategorySchema = {
    globalId: 'productCategory',
    tableName: 'product__category',
    junctionTable: true,
    attributes: {
      id: {
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
  const schemas = [
    storeSchema,
    productSchema,
    categorySchema,
    productCategorySchema,
  ];

  const pool = {
    query() {
      return {
        rows: [],
      };
    },
  };

  let Product;
  let Store;
  beforeEach(() => {
    initializeModelClasses({
      modelSchemas: schemas,
      pool,
      expose(model, schema) {
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne();
      queryStub.restore();
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
      params.should.deep.equal([]);
    });
    it('should throw error for where parameters of type string', async () => {
      let threwException;
      try {
        await Product.findOne('test');
      } catch (ex) {
        threwException = true;
        should.exist(ex);
        ex.message.should.equal('The query cannot be a string, it must be an object');
      }
      threwException.should.equal(true);
    });
    it('should support call with constraints as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne({
        select: ['name'],
        where: {
          id: product.id,
        },
        sort: 'name asc',
      });
      queryStub.restore();
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "name","id" FROM "product" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      params.should.deep.equal([product.id]);
    });
    it('should support call with where constraint as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne({
        id: product.id,
      });
      queryStub.restore();
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params.should.deep.equal([product.id]);
    });
    it('should support call with chained where constraints', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne().where({
        id: product.id,
      });
      queryStub.restore();
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=$1 LIMIT 1');
      params.should.deep.equal([product.id]);
    });
    it('should support call with chained sort', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne().sort('name asc');
      queryStub.restore();
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" ORDER BY "name" LIMIT 1');
      params.should.deep.equal([]);
    });
    it('should parse integer columns return as integer strings', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'integer',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const numberValue = 42;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: `${numberValue}`,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: numberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should parse integer columns return as float strings', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'integer',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const numberValue = 42.24;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: `${numberValue}`,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: 42,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should parse integer columns return as number', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'integer',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const numberValue = 42;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: numberValue,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: numberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should ignore large integer columns', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'integer',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0`;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: largeNumberValue,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: largeNumberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should parse float columns return as float strings', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'float',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const numberValue = 42.24;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: `${numberValue}`,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: numberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should parse float columns return as number', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'float',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const numberValue = 42.24;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: numberValue,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: numberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
    });
    it('should ignore large float columns', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {
            type: 'float',
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const largeNumberValue = `${Number.MAX_SAFE_INTEGER}0.42`;
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo: largeNumberValue,
        }],
      });
      const result = await Model.findOne();
      queryStub.restore();
      result.should.deep.equal({
        id,
        foo: largeNumberValue,
      });

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal(`SELECT "id","foo" FROM "${schema.tableName}" LIMIT 1`);
      params.should.deep.equal([]);
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

      const queryStub = sinon.stub(pool, 'query');
      queryStub.onFirstCall().returns({
        rows: [{
          id: product.id,
          name: product.name,
          store: store.id,
        }],
      });
      queryStub.onSecondCall().returns({
        rows: [store],
      });

      const result = await Product.findOne().populate('store');
      queryStub.restore();
      queryStub.calledTwice.should.equal(true);
      result.should.deep.equal(product);

      const [
        productQuery,
        productQueryParams,
      ] = queryStub.firstCall.args;
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
      productQueryParams.should.deep.equal([]);
      const [
        storeQuery,
        storeQueryParams,
      ] = queryStub.secondCall.args;
      storeQuery.should.equal('SELECT "id","name" FROM "store" WHERE "id"=$1 LIMIT 1');
      storeQueryParams.should.deep.equal([store.id]);
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

      const queryStub = sinon.stub(pool, 'query');
      queryStub.onFirstCall().returns({
        rows: [store],
      });
      queryStub.onSecondCall().returns({
        rows: [product1, product2],
      });

      const result = await Store.findOne().populate('products');
      queryStub.restore();
      queryStub.calledTwice.should.equal(true);
      result.should.deep.equal(storeWithProducts);

      const [
        storeQuery,
        storeQueryParams,
      ] = queryStub.firstCall.args;
      storeQuery.should.equal('SELECT "id","name" FROM "store" LIMIT 1');
      storeQueryParams.should.deep.equal([]);
      const [
        productQuery,
        productQueryParams,
      ] = queryStub.secondCall.args;
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
      productQueryParams.should.deep.equal([store.id]);
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

      const queryStub = sinon.stub(pool, 'query');
      queryStub.onFirstCall().returns({
        rows: [product],
      });
      queryStub.onSecondCall().returns({
        rows: [productCategory1Map, productCategory2Map],
      });
      queryStub.onThirdCall().returns({
        rows: [category1, category2],
      });

      const result = await Product.findOne().populate('categories');
      queryStub.restore();
      queryStub.calledThrice.should.equal(true);
      result.should.deep.equal(productWithCategories);

      const [
        productQuery,
        productQueryParams,
      ] = queryStub.firstCall.args;
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 1');
      productQueryParams.should.deep.equal([]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = queryStub.secondCall.args;
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = queryStub.thirdCall.args;
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1::TEXT[])');
      categoryQueryParams.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query');
      queryStub.onFirstCall().returns({
        rows: [product],
      });
      queryStub.onSecondCall().returns({
        rows: [store],
      });
      queryStub.onThirdCall().returns({
        rows: [productCategory1Map, productCategory2Map],
      });
      queryStub.onCall(3).returns({
        rows: [category1, category2],
      });

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
      queryStub.restore();
      queryStub.callCount.should.equal(4);
      result.should.deep.equal(fullProduct);

      const [
        productQuery,
        productQueryParams,
      ] = queryStub.firstCall.args;
      productQuery.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 1');
      productQueryParams.should.deep.equal([store.id]);
      const [
        storeQuery,
        storeQueryParams,
      ] = queryStub.secondCall.args;
      storeQuery.should.equal('SELECT "id","name" FROM "store" WHERE "id"=$1 LIMIT 1');
      storeQueryParams.should.deep.equal([store.id]);
      const [
        productCategoryMapQuery,
        productCategoryMapQueryParams,
      ] = queryStub.thirdCall.args;
      productCategoryMapQuery.should.equal('SELECT "category_id" AS "category","id" FROM "product__category" WHERE "product_id"=$1');
      productCategoryMapQueryParams.should.deep.equal([product.id]);
      const [
        categoryQuery,
        categoryQueryParams,
      ] = queryStub.getCall(3).args;
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1::TEXT[]) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      categoryQueryParams.should.deep.equal([
        [category1.id, category2.id],
        'category%',
      ]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
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

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const foo = faker.random.uuid();
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo,
        }],
      });
      const result1 = await Model.findOne();
      const result2 = await Model.findOne();
      queryStub.restore();

      result1.should.deep.equal(result2);
      result1.toBar().should.equal(`${foo} bar!`);
      result2.toBar().should.equal(`${foo} bar!`);
    });
    it('should not create an object/assign instance functions to null results', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
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

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [null],
      });
      const result = await Model.findOne();
      queryStub.restore();

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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find();
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product"');
      params.should.deep.equal([]);
    });
    it('should throw error for where parameters of type string', async () => {
      let threwException;
      try {
        await Product.find('test');
      } catch (ex) {
        threwException = true;
        should.exist(ex);
        ex.message.should.equal('The query cannot be a string, it must be an object');
      }
      threwException.should.equal(true);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
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
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "name","id" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2 ORDER BY "name" LIMIT 24 OFFSET 5');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find({
        id: _.map(products, 'id'),
        store,
      });
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find().where({
        store: store.id,
      });
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
    it('should support call with chained sort', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }];

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find().sort('name asc');
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" ORDER BY "name"');
      params.should.deep.equal([]);
    });
    it('should support call with chained limit', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }];

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find().limit(42);
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 42');
      params.should.deep.equal([]);
    });
    it('should support call with chained skip', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }];

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find().skip(24);
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" OFFSET 24');
      params.should.deep.equal([]);
    });
    it('should support call with chained paginate', async () => {
      const products = [{
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }, {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      }];

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.find().paginate({
        page: 3,
        limit: 100,
      });
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" LIMIT 100 OFFSET 200');
      params.should.deep.equal([]);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });

      const result = await Product.find()
        .where({
          store: store.id,
        })
        .skip(24)
        .limit(42)
        .sort('store desc');
      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "store_id"=$1 ORDER BY "store_id" DESC LIMIT 42 OFFSET 24');
      params.should.deep.equal([store.id]);
    });
    it('should have instance functions be equal across multiple queries', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        tableName: faker.random.uuid(),
        attributes: {
          id: {
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

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const id = faker.random.uuid();
      const foo = faker.random.uuid();
      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          id,
          foo,
        }],
      });
      const result1 = await Model.find();
      const result2 = await Model.find();
      queryStub.restore();

      result1.should.deep.equal(result2);
      result1[0].toBar().should.equal(`${foo} bar!`);
      result2[0].toBar().should.equal(`${foo} bar!`);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          count: products.length,
        }],
      });
      const result = await Product.count();
      queryStub.restore();
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT count(*) AS "count" FROM "product"');
      params.should.deep.equal([]);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          count: products.length,
        }],
      });
      const result = await Product.count({
        id: _.map(products, 'id'),
        store,
      });
      queryStub.restore();
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [{
          count: products.length,
        }],
      });
      const result = await Product.count().where({
        store: store.id,
      });
      queryStub.restore();
      result.should.equal(products.length);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('SELECT count(*) AS "count" FROM "product" WHERE "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
  });
  describe('#create()', () => {
    it('should execute beforeCreate if defined as a schema method', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {},
          bar: {},
        },
        async beforeCreate(values) {
          return _.merge(values, {
            called: true,
            bar: true,
          });
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const values = {
        foo: faker.random.uuid(),
      };
      await Model.create(values);

      values.called.should.equal(true);
    });
    it('should execute beforeCreate if defined as a schema attribute method', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {},
          bar: {},
          async beforeCreate(values) {
            return _.merge(values, {
              called: true,
              bar: true,
            });
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const values = {
        foo: faker.random.uuid(),
      };
      await Model.create(values);

      values.called.should.equal(true);
    });
    it('should return single object result if single value is specified', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });

      const result = await Product.create({
        name: product.name,
        store: product.store,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$2) RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });

      const result = await Product.create({
        name: product.name,
        store: product.store,
      }, {
        returnRecords: false,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.equal(true);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$2)');
      params.should.deep.equal([
        product.name,
        product.store,
      ]);
    });
    it('should return empty array results if empty value array is specified', async () => {
      const queryStub = sinon.stub(pool, 'query').returns([]);

      const result = await Product.create([]);

      queryStub.restore();
      queryStub.calledOnce.should.equal(false);
      result.should.deep.equal([]);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });

      const result = await Product.create(products.map((product) => {
        return {
          name: product.name,
          store: product.store,
        };
      }));

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$3),($2,$4) RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });

      const result = await Product.create(products.map((product) => {
        return {
          name: product.name,
          store: product.store,
        };
      }), {
        returnRecords: false,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.equal(true);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('INSERT INTO "product" ("name","store_id") VALUES ($1,$3),($2,$4)');
      params.should.deep.equal([
        products[0].name,
        products[1].name,
        products[0].store,
        products[1].store,
      ]);
    });
  });
  describe('#update()', () => {
    it('should execute beforeUpdate if defined as a schema method', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {},
          bar: {},
        },
        async beforeUpdate(values) {
          return _.merge(values, {
            called: true,
            bar: true,
          });
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const values = {
        foo: faker.random.uuid(),
      };
      await Model.update({
        id: faker.random.uuid(),
      }, values);

      values.called.should.equal(true);
    });
    it('should throw error for where parameters of type string', async () => {
      let threwException;
      try {
        await Product.update('test');
      } catch (ex) {
        threwException = true;
        should.exist(ex);
        ex.message.should.equal('The query cannot be a string, it must be an object');
      }
      threwException.should.equal(true);
    });
    it('should execute beforeUpdate if defined as a schema attribute method', async () => {
      const schema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            primaryKey: true,
          },
          foo: {},
          bar: {},
          async beforeUpdate(values) {
            return _.merge(values, {
              called: true,
              bar: true,
            });
          },
        },
      };

      let Model;
      initializeModelClasses({
        modelSchemas: [schema],
        pool,
        expose(model) {
          Model = model;
        },
      });

      const values = {
        foo: faker.random.uuid(),
      };
      await Model.update({
        id: faker.random.uuid(),
      }, values);

      values.called.should.equal(true);
    });
    it('should return array of updated objects if second parameter is not defined', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });

      const result = await Product.update({
        id: product.id,
      }, {
        name: product.name,
        store: product.store,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.deep.equal([product]);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });

      const result = await Product.update({
        id: product.id,
      }, {
        name: product.name,
        store: product.store,
      }, {
        returnRecords: false,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.equal(true);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3');
      params.should.deep.equal([
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.destroy();
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('DELETE FROM "product" RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([]);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.destroy({
        id: _.map(products, 'id'),
        store,
      });
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('DELETE FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2 RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([
        _.map(products, 'id'),
        store.id,
      ]);
    });
    it('should throw error for where parameters of type string', async () => {
      let threwException;
      try {
        await Product.destroy('test');
      } catch (ex) {
        threwException = true;
        should.exist(ex);
        ex.message.should.equal('The query cannot be a string, it must be an object');
      }
      threwException.should.equal(true);
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

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: products,
      });
      const result = await Product.destroy().where({
        store: store.id,
      });
      queryStub.restore();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('DELETE FROM "product" WHERE "store_id"=$1 RETURNING "id","name","store_id" AS "store"');
      params.should.deep.equal([store.id]);
    });
    it('should return true if returnRecords=false', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });

      const result = await Product.destroy({
        id: product.id,
      }, {
        returnRecords: false,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.equal(true);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('DELETE FROM "product" WHERE "id"=$1');
      params.should.deep.equal([
        product.id,
      ]);
    });
    it('should return true if where object is null and returnRecords=false', async () => {
      const queryStub = sinon.stub(pool, 'query').returns({});

      const result = await Product.destroy(null, {
        returnRecords: false,
      });

      queryStub.restore();
      queryStub.calledOnce.should.equal(true);
      result.should.equal(true);

      const [
        query,
        params,
      ] = queryStub.firstCall.args;
      query.should.equal('DELETE FROM "product"');
      params.should.deep.equal([]);
    });
  });
});
