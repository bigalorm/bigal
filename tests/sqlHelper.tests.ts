import assert from 'assert';

import chai from 'chai';
import * as faker from 'faker';
import { Pool } from 'postgres-pool';
import { mock } from 'ts-mockito';

import type { IReadonlyRepository, IRepository, Entity } from '../src';
import { initialize } from '../src';
import type { ModelMetadata } from '../src/metadata';
import * as sqlHelper from '../src/SqlHelper';

import {
  Category,
  Product,
  ProductCategory,
  ProductWithCreateUpdateDateTracking,
  ProductWithCreatedAt,
  ReadonlyProduct,
  Store,
  KitchenSink,
  RequiredPropertyWithDefaultValue,
  RequiredPropertyWithDefaultValueFunction,
  SimpleWithCollections,
  SimpleWithCreatedAt,
  SimpleWithCreatedAtAndUpdatedAt,
  SimpleWithJson,
  SimpleWithUpdatedAt,
} from './models';

type RepositoriesByModelNameLowered = Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;

describe('sqlHelper', () => {
  let should: Chai.Should;
  const mockedPool: Pool = mock(Pool);
  let repositoriesByModelName: RepositoriesByModelNameLowered;
  const repositoriesByModelNameLowered: RepositoriesByModelNameLowered = {};

  before(() => {
    should = chai.should();
    repositoriesByModelName = initialize({
      models: [
        Category,
        KitchenSink,
        Product,
        ProductCategory,
        ProductWithCreatedAt,
        ProductWithCreateUpdateDateTracking,
        ReadonlyProduct,
        RequiredPropertyWithDefaultValue,
        RequiredPropertyWithDefaultValueFunction,
        SimpleWithCollections,
        SimpleWithCreatedAt,
        SimpleWithCreatedAtAndUpdatedAt,
        SimpleWithJson,
        SimpleWithUpdatedAt,
        Store,
      ],
      pool: mockedPool,
    });

    for (const [modelName, repository] of Object.entries(repositoriesByModelName)) {
      repositoriesByModelName[modelName] = repository;
      repositoriesByModelNameLowered[modelName.toLowerCase()] = repository;
    }
  });

  describe('#getSelectQueryAndParams()', () => {
    describe('select', () => {
      it('should include all columns if select is undefined', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(
          `SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`,
        );
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select is empty', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          select: [],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`);
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select does not include it', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams<Product>({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          select: ['name'],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "name","id" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`);
        params.should.deep.equal([]);
      });
    });
    describe('where', () => {
      it('should include where statement if defined', () => {
        const name = faker.datatype.uuid();
        const { query, params } = sqlHelper.getSelectQueryAndParams<ProductWithCreatedAt>({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          where: {
            name,
          },
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(
          `SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "name"=$1 LIMIT 1`,
        );
        params.should.deep.equal([name]);
      });
    });
    describe('sorts', () => {
      it('should include order by statement if defined', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams<ProductWithCreatedAt>({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          sorts: [
            {
              propertyName: 'name',
            },
          ],
          where: {},
          limit: 1,
          skip: 0,
        });

        query.should.equal(
          `SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" ORDER BY "name" LIMIT 1`,
        );
        params.should.deep.equal([]);
      });
    });
    describe('skip', () => {
      it('should include OFFSET statement if skip is a number', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          where: {},
          sorts: [],
          limit: 1,
          skip: 100,
        });

        query.should.equal(
          `SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1 OFFSET 100`,
        );
        params.should.deep.equal([]);
      });
    });
    describe('limit', () => {
      it('should include LIMIT statement if limit is a number', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          where: {},
          sorts: [],
          skip: 0,
          limit: 100,
        });

        query.should.equal(
          `SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 100`,
        );
        params.should.deep.equal([]);
      });
    });
  });
  describe('#getCountQueryAndParams()', () => {
    it('should count all records if no where statement is defined', () => {
      const { query, params } = sqlHelper.getCountQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered.product.model.tableName}"`);
      params.should.deep.equal([]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };

      const { query, params } = sqlHelper.getCountQueryAndParams<Product>({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store,
        },
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "store_id"=$1`);
      params.should.deep.equal([store.id]);
    });
  });
  describe('#getInsertQueryAndParams()', () => {
    it('should throw if a required property has an undefined value', () => {
      ((): void => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          values: {
            store: faker.datatype.number(),
          },
          returnRecords: true,
        });
      }).should.throw(Error, `Create statement for "${repositoriesByModelNameLowered.product.model.name}" is missing value for required field: name`);
    });
    it('should not throw if a required property has a defaultValue and an undefined initial value', () => {
      ((): void => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
          values: {
            bar: faker.datatype.uuid(),
          },
          returnRecords: true,
        });
      }).should.not.throw();
    });
    it('should not override properties with defaultValue if value is defined', () => {
      const value = faker.datatype.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
        values: {
          foo: value,
        },
        returnRecords: true,
      });

      params.should.deep.equal([value]);
    });
    it('should set undefined properties to defaultValue if defined on schema', () => {
      const bar = faker.datatype.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
        values: {
          bar,
        },
      });

      params.should.deep.equal(['foobar', bar]);
    });
    it('should set undefined properties to result of defaultValue function if defined on schema', () => {
      const bar = faker.datatype.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValueFunction.model as ModelMetadata<RequiredPropertyWithDefaultValueFunction>,
        values: {
          bar,
        },
      });

      params.should.deep.equal(['foobar', bar]);
    });
    it('should set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const name = faker.datatype.uuid();
      const beforeTime = new Date();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          (value as string).should.equal(name);
        } else if (index === 1) {
          const valueDate = value as Date;
          (beforeTime <= valueDate && valueDate <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override createdAt if schema.autoCreatedAt and value is defined', () => {
      const createdAt = faker.date.past();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        values: {
          name,
          createdAt,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([name, createdAt]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          (value as string).should.equal(name);
        } else if (index === 1) {
          const valueDate = value as Date;
          (beforeTime <= valueDate && valueDate <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([name, updatedAt]);
    });
    it('should ignore collection properties', () => {
      const product = new Product();
      product.id = faker.datatype.number();
      const category = new Category();
      category.id = faker.datatype.number();

      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCollections.model as ModelMetadata<SimpleWithCollections>,
        values: {
          name,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Collections are excluded from values type
          products: [product],
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Collections are excluded from values type
          categories: [category],
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithCollections.model.tableName}" ("name") VALUES ($1) RETURNING "id","name"`);
      params.should.deep.equal([name]);
    });
    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = `store - ${faker.datatype.uuid()}`;

      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store,
        },
      });

      query.should.equal(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"`,
      );
      params.should.deep.equal([name, [], store.id]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const name = faker.datatype.uuid();
      const bar = [
        {
          foo: faker.datatype.uuid(),
        },
      ];

      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithJson.model as ModelMetadata<SimpleWithJson>,
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelName.SimpleWithJson.model.tableName}" ("name","bar") VALUES ($1,$2::jsonb) RETURNING "id","name","bar","key_value" AS "keyValue"`);
      params.should.deep.equal([name, JSON.stringify(bar)]);
    });
    it('should support inserting a single record and return records if returnRecords=true', () => {
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"`,
      );
      params.should.deep.equal([name, [], storeId]);
    });
    it('should support inserting a single record and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams<Product>({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "name","id"`);
      params.should.deep.equal([name, [], storeId]);
    });
    it('should support inserting a single record and not return records if returnRecords=false', () => {
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3)`);
      params.should.deep.equal([name, [], storeId]);
    });
    it('should support inserting multiple records and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId1 = faker.datatype.number();
      const name1 = faker.datatype.uuid();
      const storeId2 = faker.datatype.number();
      const name2 = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams<Product>({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: [
          {
            name: name1,
            store: storeId1,
          },
          {
            name: name2,
            store: storeId2,
          },
        ],
        returnRecords: true,
        returnSelect: ['store'],
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "store_id" AS "store","id"`);
      params.should.deep.equal([name1, name2, [], [], storeId1, storeId2]);
    });
    it('should support inserting multiple records and return records if returnRecords=true', () => {
      const storeId1 = faker.datatype.number();
      const name1 = faker.datatype.uuid();
      const storeId2 = faker.datatype.number();
      const name2 = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: [
          {
            name: name1,
            store: storeId1,
          },
          {
            name: name2,
            store: storeId2,
          },
        ],
      });

      query.should.equal(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store"`,
      );
      params.should.deep.equal([name1, name2, [], [], storeId1, storeId2]);
    });
    it('should support inserting multiple records and not return records if returnRecords=false', () => {
      const storeId1 = faker.datatype.number();
      const name1 = faker.datatype.uuid();
      const storeId2 = faker.datatype.number();
      const name2 = faker.datatype.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: [
          {
            name: name1,
            store: storeId1,
          },
          {
            name: name2,
            store: storeId2,
          },
        ],
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)`);
      params.should.deep.equal([name1, name2, [], [], storeId1, storeId2]);
    });
  });
  describe('#getUpdateQueryAndParams()', () => {
    it('should not set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" SET "name"=$1 RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([name]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          (value as string).should.equal(name);
        } else if (index === 1) {
          const valueDate = value as Date;
          (beforeTime <= valueDate && valueDate <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        where: {},
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([name, updatedAt]);
    });
    it('should ignore collection properties', () => {
      const product = new Product();
      product.id = faker.datatype.number();
      const category = new Category();
      category.id = faker.datatype.number();

      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCollections.model as ModelMetadata<SimpleWithCollections>,
        where: {},
        values: {
          name,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Collections are excluded from values type
          products: [product],
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Collections are excluded from values type
          categories: [category],
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelName.SimpleWithCollections.model.tableName}" SET "name"=$1 RETURNING "id","name"`);
      params.should.deep.equal([name]);
    });
    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = new Store();
      store.id = faker.datatype.number();
      store.name = `store - ${faker.datatype.uuid()}`;

      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {},
        values: {
          name,
          store,
        },
      });

      query.should.equal(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([name, store.id]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const name = faker.datatype.uuid();
      const bar = [
        {
          foo: faker.datatype.uuid(),
        },
      ];

      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithJson.model as ModelMetadata<SimpleWithJson>,
        where: {},
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelName.SimpleWithJson.model.tableName}" SET "name"=$1,"bar"=$2::jsonb RETURNING "id","name","bar","key_value" AS "keyValue"`);
      params.should.deep.equal([name, JSON.stringify(bar)]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };

      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams<ProductWithCreatedAt>({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          store,
        },
        values: {
          name,
        },
      });

      query.should.equal(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1 WHERE "store_id"=$2 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([name, store.id]);
    });
    it('should return records if returnRecords=true', () => {
      const productId = faker.datatype.number();
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([name, storeId, productId]);
    });
    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.datatype.number();
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "name","id"`);
      params.should.deep.equal([name, storeId, productId]);
    });
    it('should not return records if returnRecords=false', () => {
      const productId = faker.datatype.number();
      const storeId = faker.datatype.number();
      const name = faker.datatype.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3`);
      params.should.deep.equal([name, storeId, productId]);
    });
  });
  describe('#getDeleteQueryAndParams()', () => {
    it('should delete all records if no where statement is defined', () => {
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
      });

      query.should.equal(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.datatype.number(),
        name: `store - ${faker.datatype.uuid()}`,
      };

      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          store,
        },
      });

      query.should.equal(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" WHERE "store_id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([store.id]);
    });
    it('should return records if returnRecords=true', () => {
      const productId = faker.datatype.number();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          id: productId,
        },
        returnRecords: true,
      });

      query.should.equal(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" WHERE "id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      params.should.deep.equal([productId]);
    });
    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.datatype.number();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "id"=$1 RETURNING "name","id"`);
      params.should.deep.equal([productId]);
    });
    it('should not return records if returnRecords=false', () => {
      const productId = faker.datatype.number();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        returnRecords: false,
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "id"=$1`);
      params.should.deep.equal([productId]);
    });
  });
  describe('#getColumnsToSelect()', () => {
    it('should include all columns if select is undefined (explicit)', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        select: undefined,
      });

      query.should.equal('"id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });
    it('should include all columns if select is undefined (implicit)', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
      });

      query.should.equal('"id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });
    it('should include primaryKey column if select is empty', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        select: [],
      });

      query.should.equal('"id"');
    });
    it('should include primaryKey column if select does not include it', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        select: ['name'],
      });

      query.should.equal('"name","id"');
    });
  });
  describe('#buildWhereStatement()', () => {
    it('should return empty if where is undefined', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
      });

      should.not.exist(whereStatement);
      params.should.deep.equal([]);
    });
    it('should throw if query value is undefined', () => {
      ((): void => {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - testing a value not allowed by type definition
            store: undefined,
          },
        });
      }).should.throw(Error, `Attempting to query with an undefined value. store on ${repositoriesByModelNameLowered.product.model.name}`);
    });
    it('should use column name if defined', () => {
      const storeId = faker.datatype.number();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store: storeId,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "store_id"=$1');
      params.should.deep.equal([storeId]);
    });
    it('should use property name if columnName is not defined', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name"=$1');
      params.should.deep.equal([name]);
    });
    it('should handle startsWith', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            startsWith: name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`${name}%`]);
    });
    it('should handle startsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            startsWith: [name1, name2],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([[`${name1.toLowerCase()}%`, `${name2.toLowerCase()}%`]]);
    });
    it('should handle endsWith', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            endsWith: name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`%${name}`]);
    });
    it('should handle endsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            endsWith: [name1, name2],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([[`%${name1.toLowerCase()}`, `%${name2.toLowerCase()}`]]);
    });
    it('should handle contains', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            contains: name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`%${name}%`]);
    });
    it('should handle contains with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            contains: [name1, name2],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([[`%${name1.toLowerCase()}%`, `%${name2.toLowerCase()}%`]]);
    });
    it('should handle like', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle not like', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: name,
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" NOT ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle like with an empty value', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: '',
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" = \'\'');
      params.should.deep.equal([]);
    });
    it('should handle not like with an empty value', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: '',
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" != \'\'');
      params.should.deep.equal([]);
    });
    it('should handle like with array with a single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: [name],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array with a single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: [name],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" NOT ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: [name1, name2],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([[name1.toLowerCase(), name2.toLowerCase()]]);
    });
    it('should handle like with an array of null, empty string, and single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: [null, '', name],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE ("name" IS NULL OR "name" = \'\' OR "name" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle not like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: [name1, name2],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE lower("name")<>ALL($1::TEXT[])');
      params.should.deep.equal([[name1.toLowerCase(), name2.toLowerCase()]]);
    });
    it('should handle not like with an array of null, empty string, and single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: [null, '', name],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" IS NOT NULL AND "name" != \'\' AND "name" NOT ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle like with an empty array', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            like: [],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE 1<>1');
      params.should.deep.equal([]);
    });
    it('should handle not like with an empty array', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': {
              like: [],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should handle like with array column and array with a single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            like: [name],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array column and array with a single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            '!': {
              like: [name],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle like with array column and single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            like: name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array column and a single value', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            '!': {
              like: name,
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            like: [name1, name2],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")=ANY($1::TEXT[]))');
      params.should.deep.equal([[name1.toLowerCase(), name2.toLowerCase()]]);
    });
    it('should handle not like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          aliases: {
            '!': {
              like: [name1, name2],
            },
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")<>ALL($1::TEXT[]))');
      params.should.deep.equal([[name1.toLowerCase(), name2.toLowerCase()]]);
    });
    it('should handle date value', () => {
      const now = new Date();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          createdAt: {
            '>': now,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "created_at">$1');
      params.should.deep.equal([now]);
    });
    it('should handle or', () => {
      const name = faker.datatype.uuid();
      const store = faker.datatype.number();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          or: [
            {
              name,
            },
            {
              name: {
                '!': name,
              },
              store,
            },
          ],
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE (("name"=$1) OR ("name"<>$2 AND "store_id"=$3))');
      params.should.deep.equal([name, name, store]);
    });
    it('should handle mixed or/and constraints', () => {
      const id = faker.datatype.number();
      const name = faker.datatype.uuid();
      const store = faker.datatype.number();
      const sku = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id,
          or: [
            {
              name,
            },
            {
              name: {
                '!': name,
              },
              store,
            },
          ],
          sku,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "id"=$1 AND (("name"=$2) OR ("name"<>$3 AND "store_id"=$4)) AND "sku"=$5');
      params.should.deep.equal([id, name, name, store, sku]);
    });
    it('should treat string type with array values as an =ANY() statement', () => {
      const name = [faker.datatype.uuid(), faker.datatype.uuid()];
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name"=ANY($1::TEXT[])');
      params.should.deep.equal([name]);
    });
    it('should treat integer type with array values as an =ANY() statement', () => {
      const values = [42, 24];

      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        where: {
          intColumn: values,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "int_column"=ANY($1::INTEGER[])');
      params.should.deep.equal([values]);
    });
    it('should treat float type with array values as an =ANY() statement', () => {
      const values = [42.42, 24.24];

      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        where: {
          floatColumn: values,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "float_column"=ANY($1::NUMERIC[])');
      params.should.deep.equal([values]);
    });
    describe('type: "array"', () => {
      it('should handle empty array value with array type column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: [],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE "array_column"=\'{}\'');
        params.should.deep.equal([]);
      });
      it('should handle comparing array type as an array of null or empty', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: [null, []] as (string | null)[],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE ("array_column" IS NULL OR "array_column"=\'{}\')');
        params.should.deep.equal([]);
      });
      it('should handle comparing array type with single value as =ANY()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: value,
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1=ANY("array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with array of a single value as =ANY()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: [value],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1=ANY("array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with negated single value as <>ALL()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: {
              '!': value,
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with negated array of a single value as <>ALL()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: {
              '!': [value],
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with array value as separate =ANY() statements', () => {
        const values = [faker.datatype.uuid(), faker.datatype.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: values,
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE ($1=ANY("array_column") OR $2=ANY("array_column"))');
        params.should.deep.equal([values[0], values[1]]);
      });
      it('should handle comparing array type with negated array value as separate <>ALL() statements', () => {
        const values = [faker.datatype.uuid(), faker.datatype.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: {
              '!': values,
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("array_column") AND $2<>ALL("array_column")');
        params.should.deep.equal([values[0], values[1]]);
      });
    });
    describe('type: "string[]"', () => {
      it('should handle empty array value with array type column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: [],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE "string_array_column"=\'{}\'');
        params.should.deep.equal([]);
      });
      it('should handle comparing array type as an array of null or empty', () => {
        const empty: string[] = [];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: [null, empty] as (string | null)[],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE ("string_array_column" IS NULL OR "string_array_column"=\'{}\')');
        params.should.deep.equal([]);
      });
      it('should handle comparing array type with single value as =ANY()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: value,
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1=ANY("string_array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with array of a single value as =ANY()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: [value],
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1=ANY("string_array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with negated single value as <>ALL()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: {
              '!': value,
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("string_array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with negated array of a single value as <>ALL()', () => {
        const value = faker.datatype.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: {
              '!': [value],
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("string_array_column")');
        params.should.deep.equal([value]);
      });
      it('should handle comparing array type with array value as separate =ANY() statements', () => {
        const values = [faker.datatype.uuid(), faker.datatype.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: values,
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE ($1=ANY("string_array_column") OR $2=ANY("string_array_column"))');
        params.should.deep.equal([values[0], values[1]]);
      });
      it('should handle comparing array type with negated array value as separate <>ALL() statements', () => {
        const values = [faker.datatype.uuid(), faker.datatype.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: {
              '!': values,
            },
          },
        });

        assert(whereStatement);
        whereStatement.should.equal('WHERE $1<>ALL("string_array_column") AND $2<>ALL("string_array_column")');
        params.should.deep.equal([values[0], values[1]]);
      });
    });
    it('should treat empty array value as "false"', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: [],
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE 1<>1');
      params.should.deep.equal([]);
    });
    it('should treat negated empty array value as "true"', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': [],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should handle single value array', () => {
      const name = faker.datatype.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: [name],
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name"=$1');
      params.should.deep.equal([name]);
    });
    it('should handle an array value with NULL explicitly', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: [null, ''],
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE ("name" IS NULL OR "name"=$1)');
      params.should.deep.equal(['']);
    });
    it('should treat negation of array value as an <>ALL() statement', () => {
      const name = [faker.datatype.uuid(), faker.datatype.uuid()];
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': name,
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name"<>ALL($1::TEXT[])');
      params.should.deep.equal([name]);
    });
    it('should treat negation of empty array value as "true"', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': [],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should treat negation of array value with NULL explicitly as AND statements', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: {
            '!': [null, ''],
          },
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "name" IS NOT NULL AND "name"<>$1');
      params.should.deep.equal(['']);
    });
    it('should use primaryKey if hydrated object is passed as a query value', () => {
      const store = {
        id: faker.datatype.number(),
      };

      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store,
        },
      });

      assert(whereStatement);
      whereStatement.should.equal('WHERE "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
  });
  describe('#buildOrderStatement()', () => {
    it('should return empty if there are no orders defined', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [],
      });

      result.should.equal('');
    });
    it('should handle single string order with implicit direction', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'name',
          },
        ],
      });

      result.should.equal('ORDER BY "name"');
    });
    it('should handle single string order with implicit direction and explicit columnName', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'intColumn',
          },
        ],
      });

      result.should.equal('ORDER BY "int_column"');
    });
    it('should handle single string order with explicit desc direction', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'name',
            descending: true,
          },
        ],
      });

      result.should.equal('ORDER BY "name" DESC');
    });
    it('should handle single string order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'intColumn',
            descending: true,
          },
        ],
      });

      result.should.equal('ORDER BY "int_column" DESC');
    });
    it('should handle multiple string order', () => {
      const result = sqlHelper.buildOrderStatement({
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'intColumn',
            descending: true,
          },
          {
            propertyName: 'name',
          },
        ],
      });

      result.should.equal('ORDER BY "int_column" DESC,"name"');
    });
  });
});
