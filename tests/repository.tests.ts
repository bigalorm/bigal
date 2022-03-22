import assert from 'assert';

import { faker } from '@faker-js/faker';
import chai from 'chai';
import * as _ from 'lodash';
import type { QueryResult as PostgresQueryResult } from 'pg';
import { Pool } from 'postgres-pool';
import { anyString, anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';

import type { CreateUpdateParams, QueryResult, Repository } from '../src';
import { initialize } from '../src';

import { Category, Product, ProductCategory, ProductWithCreateUpdateDateTracking, SimpleWithStringCollection, Store } from './models';
import * as generator from './utils/generator';

function getQueryResult<T>(rows: T[] = []): PostgresQueryResult<T> {
  return {
    command: 'select',
    rowCount: 1,
    oid: 1,
    fields: [],
    rows,
  };
}

describe('Repository', () => {
  let should: Chai.Should;
  const mockedPool: Pool = mock(Pool);
  /* eslint-disable @typescript-eslint/naming-convention */
  let ProductRepository: Repository<Product>;
  let ProductCategoryRepository: Repository<ProductCategory>;
  let SimpleWithStringCollectionRepository: Repository<SimpleWithStringCollection>;
  let StoreRepository: Repository<Store>;
  let ProductWithCreateUpdateDateTrackingRepository: Repository<ProductWithCreateUpdateDateTracking>;
  /* eslint-enable @typescript-eslint/naming-convention */

  before(() => {
    should = chai.should();

    const repositoriesByModelName = initialize({
      models: [Category, Product, ProductCategory, ProductWithCreateUpdateDateTracking, SimpleWithStringCollection, Store],
      pool: instance(mockedPool),
    });

    ProductRepository = repositoriesByModelName.Product as Repository<Product>;
    ProductCategoryRepository = repositoriesByModelName.ProductCategory as Repository<ProductCategory>;
    SimpleWithStringCollectionRepository = repositoriesByModelName.SimpleWithStringCollection as Repository<SimpleWithStringCollection>;
    StoreRepository = repositoriesByModelName.Store as Repository<Store>;
    ProductWithCreateUpdateDateTrackingRepository = repositoriesByModelName.ProductWithCreateUpdateDateTracking as Repository<ProductWithCreateUpdateDateTracking>;
  });

  beforeEach(() => {
    reset(mockedPool);
  });

  describe('#create()', () => {
    let store: QueryResult<Store>;
    beforeEach(() => {
      store = generator.store();
    });

    it('should execute beforeCreate if defined as a schema method', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: 42,
          },
        ]),
      );

      await ProductWithCreateUpdateDateTrackingRepository.create({
        name: 'foo',
      });

      verify(mockedPool.query(anyString(), anything())).once();
      const [, params] = capture(mockedPool.query).first();

      assert(params);
      params.should.deep.equal(['beforeCreate - foo', []]);
    });
    it('should return single object result if single value is specified', async () => {
      const product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: product.store,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], product.store]);
    });
    it('should return single object result if single value is specified - Promise.all', async () => {
      const product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const [result] = await Promise.all([
        ProductRepository.create({
          name: product.name,
          store: product.store,
        }),
      ]);

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], product.store]);
    });
    it('should return void if single value is specified and returnRecords=false', async () => {
      const product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.create(
        {
          name: product.name,
          store: product.store,
        },
        {
          returnRecords: false,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3)');
      assert(params);
      params.should.deep.equal([product.name, [], product.store]);
    });
    it('should return empty array results if empty value array is specified', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([]));

      const result = await ProductRepository.create([]);

      verify(mockedPool.query(anyString(), anything())).never();
      should.exist(result);
      result.should.deep.equal([]);
    });
    it('should return object array results if multiple values are specified', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.create(
        products.map((product) => {
          return {
            name: product.name,
            store: product.store,
          };
        }),
      );

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([products[0].name, products[1].name, [], [], products[0].store, products[1].store]);
    });
    it('should return void if multiple values are specified and returnRecords=false', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.create(
        products.map((product) => {
          return {
            name: product.name,
            store: product.store,
          };
        }),
        {
          returnRecords: false,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)');
      assert(params);
      params.should.deep.equal([products[0].name, products[1].name, [], [], products[0].store, products[1].store]);
    });
    it('should allow populated value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], store.id]);
    });
    it('should allow populated (QueryResult) value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsQueryResult: QueryResult<Store> = {
        ...store,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: storeAsQueryResult,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], store.id]);
    });
    it('should allow partial Entity (omitting some required fields) as a value parameter', async () => {
      const category = generator.category();
      const product: Pick<Product, 'id' | 'name'> = generator.product({
        store: store.id,
      });
      const productCategory = generator.productCategory(product, category);

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([productCategory]));

      const result = await ProductCategoryRepository.create({
        product,
        category,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(productCategory);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product__category" ("product_id","category_id") VALUES ($1,$2) RETURNING "id","product_id" AS "product","category_id" AS "category"');
      assert(params);
      params.should.deep.equal([product.id, category.id]);
    });
    it(`should allow populated (Pick<T, 'id'>) value parameters`, async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsPickId: Pick<Store, 'id'> = {
        id: store.id,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.create({
        name: product.name,
        store: storeAsPickId,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], store.id]);
    });
    it('should insert with string array value parameter', async () => {
      const item = generator.simpleWithStringCollection();

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([item]));

      const createParams: CreateUpdateParams<SimpleWithStringCollection> = {
        name: item.name,
      };
      createParams.otherIds = item.otherIds;

      const result = await SimpleWithStringCollectionRepository.create(createParams);

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(item);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "simple" ("name","other_ids") VALUES ($1,$2) RETURNING "id","name","other_ids" AS "otherIds"');
      assert(params);
      params.should.deep.equal([item.name, item.otherIds]);
    });
    it('should ignore one-to-many collection values', async () => {
      const product: Product = generator.product({
        store: store.id,
      });
      product.categories = [];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([store]));
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Collections are excluded from values type
      const result = await StoreRepository.create({
        name: store.name,
        products: [product],
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(store);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "stores" ("name") VALUES ($1) RETURNING "id","name"');
      assert(params);
      params.should.deep.equal([store.name]);
    });
    it('should ignore many-to-many collection values', async () => {
      const category = generator.category();
      const product: Product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Collections are excluded from values type
      const result = await ProductRepository.create({
        name: product.name,
        store: product.store,
        categories: [category],
      });

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "products" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, [], product.store]);
    });
  });
  describe('#update()', () => {
    let store: QueryResult<Store>;
    beforeEach(() => {
      store = generator.store();
    });

    it('should execute beforeUpdate if defined as a schema method', async () => {
      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([
          {
            id: 42,
          },
        ]),
      );

      const id = faker.datatype.number();

      await ProductWithCreateUpdateDateTrackingRepository.update(
        {
          id,
        },
        {
          name: 'foo',
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      const [, params] = capture(mockedPool.query).first();

      assert(params);
      params.should.deep.equal(['beforeUpdate - foo', id]);
    });
    it('should return array of updated objects if second parameter is not defined', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: product.store,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.deep.equal([product]);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, product.store, product.id]);
    });
    it('should return array of updated objects if second parameter is not defined - Promise.all', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const [results] = await Promise.all([
        ProductRepository.update(
          {
            id: product.id,
          },
          {
            name: product.name,
            store: product.store,
          },
        ),
      ]);

      verify(mockedPool.query(anyString(), anything())).once();
      results.should.deep.equal([product]);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, product.store, product.id]);
    });
    it('should return void if returnRecords=false', async () => {
      const product: Product = generator.product({
        store: store.id,
      });

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const result = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: product.store,
        },
        {
          returnRecords: false,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3');
      assert(params);
      params.should.deep.equal([product.name, product.store, product.id]);
    });
    it('should allow populated (QueryResult) value parameters', async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsQueryResult: QueryResult<Store> = {
        ...store,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const results = await ProductRepository.update(
        {
          id: product.id,
        },
        {
          name: product.name,
          store: storeAsQueryResult,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      results.should.deep.equal([product]);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, store.id, product.id]);
    });
    it(`should allow populated (Pick<T, 'id'>) value parameters`, async () => {
      const product = generator.product({
        store: store.id,
      });

      const storeAsPickId: Pick<Store, 'id'> = {
        id: store.id,
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([product]));

      const results = await ProductRepository.update(
        {
          id: product,
        },
        {
          name: product.name,
          store: storeAsPickId,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      results.should.deep.equal([product]);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "products" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([product.name, store.id, product.id]);
    });
    it('should allow partial Entity (omitting some required fields) as a value parameter', async () => {
      const category = generator.category();
      const product: Pick<Product, 'id' | 'name'> = generator.product({
        store: store.id,
      });
      const productCategory = generator.productCategory(product, category);

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult([productCategory]));

      const results = await ProductCategoryRepository.update(
        {
          id: productCategory.id,
        },
        {
          product,
          category,
        },
      );

      verify(mockedPool.query(anyString(), anything())).once();
      results.should.deep.equal([productCategory]);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "product__category" SET "product_id"=$1,"category_id"=$2 WHERE "id"=$3 RETURNING "id","product_id" AS "product","category_id" AS "category"');
      assert(params);
      params.should.deep.equal([product.id, category.id, productCategory.id]);
    });
  });
  describe('#destroy()', () => {
    let store: QueryResult<Store>;
    beforeEach(() => {
      store = generator.store();
    });

    it('should delete all records and return void if there are no constraints', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy();
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should delete all records if empty constraint and return all data if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnRecords: true });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should delete all records if empty constraint and return specific columns if returnSelect is specified', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnSelect: ['name'] });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" RETURNING "name","id"');
      assert(params);
      params.should.deep.equal([]);
    });
    it('should delete all records if empty constraint and return id column if returnSelect is empty', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy({}, { returnSelect: [] });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" RETURNING "id"');
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy({
        id: _.map(products, 'id'),
        store,
      });
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2');
      assert(params);
      params.should.deep.equal([_.map(products, 'id'), store.id]);
    });
    it('should support call constraints as a parameter if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));

      const result = await ProductRepository.destroy(
        {
          id: _.map(products, 'id'),
          store,
        },
        { returnRecords: true },
      );
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "id"=ANY($1::INTEGER[]) AND "store_id"=$2 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.destroy().where({
        store: store.id,
      });
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints if returnRecords=true', async () => {
      const products = [
        generator.product({
          store: store.id,
        }),
        generator.product({
          store: store.id,
        }),
      ];

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const result = await ProductRepository.destroy({}, { returnRecords: true }).where({
        store: store.id,
      });
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "store_id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
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

      when(mockedPool.query(anyString(), anything())).thenResolve(getQueryResult(products));
      const [result] = await Promise.all([
        ProductRepository.destroy().where({
          store: store.id,
        }),
      ]);
      should.not.exist(result);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "store_id"=$1');
      assert(params);
      params.should.deep.equal([store.id]);
    });
    it('should support call with chained where constraints if returnRecords=true - Promise.all', async () => {
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
        ProductRepository.destroy({}, { returnRecords: true }).where({
          store: store.id,
        }),
      ]);
      should.exist(result);
      result.should.deep.equal(products);

      const [query, params] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "products" WHERE "store_id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"');
      assert(params);
      params.should.deep.equal([store.id]);
    });
  });
});
