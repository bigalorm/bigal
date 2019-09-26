/*
import chai from 'chai';
import * as _ from 'lodash';
import * as faker from 'faker';
import { Pool } from 'postgres-pool';
import {
 anyString, anything, instance, mock, when, reset, capture, verify,
} from 'ts-mockito';
import {
  initialize,
  Entity,
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
        case 'Store':
          StoreRepository = repository as Repository<Store>;
          break;
        default:
          // Skip other repositories that are not used here
          break;
      }
    }
  });

  describe('#create()', () => {
    it('should execute beforeCreate if defined as a schema method', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        tableName: 'foo',
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
          return _.merge(values, {
            calledCreate: true,
            bar: true,
          });
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
        getQueryResult([{
          id: 42,
        }]),
      );

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
    it('should throw if readonly', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      try {
        await ReadonlyProduct.create({
          name: product.name,
          store: product.store,
        });
        false.should.equal(true);
      } catch (ex) {
        ex.message.should.equal('readonlyProduct is readonly.');
      }
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
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
      params!.should.deep.equal([
        product.name,
        [],
        product.store,
      ]);
    });
    it('should return single object result if single value is specified - Promise.all', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const [
        result,
      ] = await Promise.all([
        Product.create({
          name: product.name,
          store: product.store,
        }),
      ]);

      verify(mockedPool.query(anyString(), anything())).once();
      should.exist(result);
      result.should.deep.equal(product);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
      params!.should.deep.equal([
        product.name,
        [],
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
      result.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","alias_names","store_id") VALUES ($1,$2,$3)');
      params!.should.deep.equal([
        product.name,
        [],
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

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult(products),
      );

      const result = await Product.create(products.map((product) => ({
          name: product.name,
          store: product.store,
        })));

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
      params!.should.deep.equal([
        products[0].name,
        products[1].name,
        [],
        [],
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

      const result = await Product.create(products.map((product) => ({
          name: product.name,
          store: product.store,
        })), {
        returnRecords: false,
      });

      verify(mockedPool.query(anyString(), anything())).once();
      result.should.equal(true);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('INSERT INTO "product" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)');
      params!.should.deep.equal([
        products[0].name,
        products[1].name,
        [],
        [],
        products[0].store,
        products[1].store,
      ]);
    });
  });
  describe('#update()', () => {
    it('should execute beforeUpdate if defined as a schema method', async () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        tableName: 'foo',
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
          return _.merge(values, {
            calledUpdate: true,
            bar: true,
          });
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

      interface ValueType {
        id: number;
        calledCreate?: boolean;
        calledUpdate?: boolean;
        foo?: boolean;
        bar?: boolean;
      }

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([{
          id: 42,
        }]),
      );

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
    it('should throw if readonly', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      try {
        await ReadonlyProduct.update({
          id: product.id,
        }, {
          name: product.name,
          store: product.store,
        });
        false.should.equal(true);
      } catch (ex) {
        ex.message.should.equal('readonlyProduct is readonly.');
      }
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
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
      params!.should.deep.equal([
        product.name,
        product.store,
        product.id,
      ]);
    });
    it('should return array of updated objects if second parameter is not defined - Promise.all', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      const [
        results,
      ] = await Promise.all([
        Product.update({
          id: product.id,
        }, {
          name: product.name,
          store: product.store,
        }),
      ]);

      verify(mockedPool.query(anyString(), anything())).once();
      results.should.deep.equal([product]);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('UPDATE "product" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
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
    it('should throw if readonly', async () => {
      const product = {
        id: faker.random.uuid(),
        name: `product - ${faker.random.uuid()}`,
        store: faker.random.uuid(),
      };

      when(mockedPool.query(anyString(), anything())).thenResolve(
        getQueryResult([product]),
      );

      try {
        await ReadonlyProduct.destroy({});
        false.should.equal(true);
      } catch (ex) {
        ex.message.should.equal('readonlyProduct is readonly.');
      }
    });
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
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
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
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "id"=ANY($1::TEXT[]) AND "store_id"=$2 RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
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
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "store_id"=$1 RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
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
        getQueryResult(products),
      );
      const [
        result,
      ] = await Promise.all([
        Product.destroy().where({
          store: store.id,
        }),
      ]);
      should.exist(result);
      result.should.deep.equal(products);

      const [
        query,
        params,
      ] = capture(mockedPool.query).first();
      query.should.equal('DELETE FROM "product" WHERE "store_id"=$1 RETURNING "id","name","serial_number" AS "serialNumber","alias_names" AS "aliases","store_id" AS "store"');
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
      result.should.equal(true);

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
*/
