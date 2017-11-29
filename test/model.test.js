'use strict';

const _ = require('lodash');
const faker = require('faker');
const sinon = require('sinon');
require('chai');

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
    it('should support call with where constraints', async () => {
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
    it('should support call with sorting', async () => {
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
    it('should support call with where and sort as a parameter', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
      };

      const queryStub = sinon.stub(pool, 'query').returns({
        rows: [product],
      });
      const result = await Product.findOne({
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
      query.should.equal('SELECT "id","name","store_id" AS "store" FROM "product" WHERE "id"=$1 ORDER BY "name" LIMIT 1');
      params.should.deep.equal([product.id]);
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
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1)');
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
      categoryQuery.should.equal('SELECT "id","name" FROM "category" WHERE "id"=ANY($1) AND "name" ILIKE $2 ORDER BY "name" LIMIT 2');
      categoryQueryParams.should.deep.equal([
        [category1.id, category2.id],
        'category%',
      ]);
    });
  });
});
