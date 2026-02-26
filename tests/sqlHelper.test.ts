import assert from 'node:assert';

import { faker } from '@faker-js/faker';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { QueryError } from '../src/errors/index.js';
import { initialize, subquery } from '../src/index.js';
import { type AggregateBuilder, type Entity, type IReadonlyRepository, type IRepository, type ModelMetadata, type PoolLike, type SelectAggregateExpression, type WhereQuery } from '../src/index.js';
import * as sqlHelper from '../src/SqlHelper.js';

import {
  Category,
  ImportedItem,
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
  SimpleWithSchema,
  SimpleWithStringId,
  SimpleWithUpdatedAt,
  SimpleWithUUID,
  SimpleWithVersion,
  Store,
} from './models/index.js';

interface RepositoriesByModelName {
  Category: IRepository<Entity>;
  ImportedItem: IRepository<Entity>;
  KitchenSink: IRepository<Entity>;
  Product: IRepository<Entity>;
  ProductCategory: IRepository<Entity>;
  ProductWithCreatedAt: IRepository<Entity>;
  ProductWithCreateUpdateDateTracking: IRepository<Entity>;
  ReadonlyProduct: IReadonlyRepository<Entity>;
  RequiredPropertyWithDefaultValue: IRepository<Entity>;
  RequiredPropertyWithDefaultValueFunction: IRepository<Entity>;
  SimpleWithCollections: IRepository<Entity>;
  SimpleWithCreatedAt: IRepository<Entity>;
  SimpleWithCreatedAtAndUpdatedAt: IRepository<Entity>;
  SimpleWithJson: IRepository<Entity>;
  SimpleWithSchema: IRepository<Entity>;
  SimpleWithStringId: IRepository<Entity>;
  SimpleWithUpdatedAt: IRepository<Entity>;
  SimpleWithUUID: IRepository<Entity>;
  SimpleWithVersion: IRepository<Entity>;
  Store: IRepository<Entity>;
}

type LowerCaseKeys<T, K extends string & keyof T = string & keyof T> = Record<Lowercase<K>, T[K]>;

describe('sqlHelper', () => {
  let repositoriesByModelName: RepositoriesByModelName;
  const repositoriesByModelNameLowered = {} as LowerCaseKeys<RepositoriesByModelName>;

  beforeAll(() => {
    const mockedPool: PoolLike = { query: vi.fn() };
    repositoriesByModelName = initialize({
      models: [
        Category,
        ImportedItem,
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
        SimpleWithSchema,
        SimpleWithStringId,
        SimpleWithUpdatedAt,
        SimpleWithUUID,
        SimpleWithVersion,
        Store,
      ],
      pool: mockedPool,
    }) as unknown as RepositoriesByModelName;

    for (const [modelName, repository] of Object.entries(repositoriesByModelName)) {
      // @ts-expect-error - Expect model names to match up
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      repositoriesByModelName[modelName] = repository;
      // @ts-expect-error - Expect lower case model names to match up
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

        expect(query).toBe(
          `SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`,
        );
        expect(params).toStrictEqual([]);
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

        expect(query).toBe(`SELECT "id" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`);
        expect(params).toStrictEqual([]);
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

        expect(query).toBe(`SELECT "name","id" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1`);
        expect(params).toStrictEqual([]);
      });

      it('should include schema if specified for model', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams<SimpleWithSchema>({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithschema.model as ModelMetadata<SimpleWithSchema>,
          select: ['name'],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        expect(query).toBe(`SELECT "name","id" FROM "${repositoriesByModelNameLowered.simplewithschema.model.schema}"."${repositoriesByModelNameLowered.simplewithschema.model.tableName}" LIMIT 1`);
        expect(params).toStrictEqual([]);
      });
    });

    describe('where', () => {
      it('should include where statement if defined', () => {
        const name = faker.string.uuid();
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

        expect(query).toBe(
          `SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "name"=$1 LIMIT 1`,
        );
        expect(params).toStrictEqual([name]);
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

        expect(query).toBe(
          `SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" ORDER BY "name" LIMIT 1`,
        );
        expect(params).toStrictEqual([]);
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

        expect(query).toBe(
          `SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 1 OFFSET 100`,
        );
        expect(params).toStrictEqual([]);
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

        expect(query).toBe(
          `SELECT "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered.product.model.tableName}" LIMIT 100`,
        );
        expect(params).toStrictEqual([]);
      });
    });

    describe('distinctOn', () => {
      it('should generate DISTINCT ON clause with single column', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {},
          sorts: [{ propertyName: 'store' }],
          skip: 0,
          limit: 0,
          distinctOn: ['store'],
        });

        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id"');
        expect(params).toStrictEqual([]);
      });

      it('should generate DISTINCT ON clause with multiple columns', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {},
          sorts: [{ propertyName: 'store' }, { propertyName: 'name', descending: true }],
          skip: 0,
          limit: 0,
          distinctOn: ['store', 'name'],
        });

        expect(query).toBe('SELECT DISTINCT ON ("store_id","name") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id","name" DESC');
        expect(params).toStrictEqual([]);
      });

      it('should work with additional ORDER BY columns after DISTINCT ON columns', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
          where: {},
          sorts: [{ propertyName: 'store' }, { propertyName: 'createdAt', descending: true }],
          skip: 0,
          limit: 0,
          distinctOn: ['store'],
        });

        expect(query).toBe(
          'SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "products" ORDER BY "store_id","created_at" DESC',
        );
        expect(params).toStrictEqual([]);
      });

      it('should throw error if ORDER BY is missing when using DISTINCT ON', () => {
        expect((): void => {
          sqlHelper.getSelectQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
            where: {},
            sorts: [],
            skip: 0,
            limit: 0,
            distinctOn: ['store'],
          });
        }).to.throw(QueryError, /DISTINCT ON requires ORDER BY/);
      });

      it('should throw error if DISTINCT ON columns do not match leftmost ORDER BY columns', () => {
        expect((): void => {
          sqlHelper.getSelectQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
            where: {},
            sorts: [{ propertyName: 'name' }],
            skip: 0,
            limit: 0,
            distinctOn: ['store'],
          });
        }).to.throw(QueryError, /DISTINCT ON columns must match the leftmost ORDER BY columns/);
      });

      it('should throw error if fewer ORDER BY columns than DISTINCT ON columns', () => {
        expect((): void => {
          sqlHelper.getSelectQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
            where: {},
            sorts: [{ propertyName: 'store' }],
            skip: 0,
            limit: 0,
            distinctOn: ['store', 'name'],
          });
        }).to.throw(QueryError, /DISTINCT ON columns must match the leftmost ORDER BY columns/);
      });

      it('should work with WHERE clause', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: { name: 'Widget' },
          sorts: [{ propertyName: 'store' }],
          skip: 0,
          limit: 0,
          distinctOn: ['store'],
        });

        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" WHERE "name"=$1 ORDER BY "store_id"');
        expect(params).toStrictEqual(['Widget']);
      });

      it('should work with LIMIT', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {},
          sorts: [{ propertyName: 'store' }],
          skip: 0,
          limit: 10,
          distinctOn: ['store'],
        });

        expect(query).toBe('SELECT DISTINCT ON ("store_id") "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store" FROM "products" ORDER BY "store_id" LIMIT 10');
        expect(params).toStrictEqual([]);
      });

      it('should work with select projection', () => {
        const { query, params } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          select: ['name', 'store'],
          where: {},
          sorts: [{ propertyName: 'store' }],
          skip: 0,
          limit: 0,
          distinctOn: ['store'],
        });

        expect(query).toBe('SELECT DISTINCT ON ("store_id") "name","store_id" AS "store","id" FROM "products" ORDER BY "store_id"');
        expect(params).toStrictEqual([]);
      });
    });
  });

  describe('#getCountQueryAndParams()', () => {
    it('should count all records if no where statement is defined', () => {
      const { query, params } = sqlHelper.getCountQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
      });

      expect(query).toBe(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered.product.model.tableName}"`);
      expect(params).toStrictEqual([]);
    });

    it('should include where statement if defined', () => {
      const store = {
        id: faker.number.int(),
        name: `store - ${faker.string.uuid()}`,
      };

      const { query, params } = sqlHelper.getCountQueryAndParams<Product>({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store,
        },
      });

      expect(query).toBe(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "store_id"=$1`);
      expect(params).toStrictEqual([store.id]);
    });

    it('should include schema if specified for model', () => {
      const { query, params } = sqlHelper.getCountQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithschema.model as ModelMetadata<SimpleWithSchema>,
      });

      expect(query).toBe(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered.simplewithschema.model.schema}"."${repositoriesByModelNameLowered.simplewithschema.model.tableName}"`);
      expect(params).toStrictEqual([]);
    });
  });

  describe('#getInsertQueryAndParams()', () => {
    it('should throw if a required property has an undefined value', () => {
      expect((): void => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          values: {
            store: faker.number.int(),
          },
          returnRecords: true,
        });
      }).to.throw(Error, `Create statement for "${repositoriesByModelNameLowered.product.model.name}" is missing value for required field: name`);
    });

    it('should not throw if a required property has a defaultValue and an undefined initial value', () => {
      expect((): void => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
          values: {
            bar: faker.string.uuid(),
          },
          returnRecords: true,
        });
      }).to.not.throw();
    });

    it('should not override properties with defaultValue if value is defined', () => {
      const value = faker.string.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
        values: {
          foo: value,
        },
        returnRecords: true,
      });

      expect(params).toStrictEqual([value]);
    });

    it('should set undefined properties to defaultValue if defined on schema', () => {
      const bar = faker.string.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValue.model as ModelMetadata<RequiredPropertyWithDefaultValue>,
        values: {
          bar,
        },
      });

      expect(params).toStrictEqual(['foobar', bar]);
    });

    it('should set undefined properties to result of defaultValue function if defined on schema', () => {
      const bar = faker.string.uuid();
      const { params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.RequiredPropertyWithDefaultValueFunction.model as ModelMetadata<RequiredPropertyWithDefaultValueFunction>,
        values: {
          bar,
        },
      });

      expect(params).toStrictEqual(['foobar', bar]);
    });

    it('should set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const name = faker.string.uuid();
      const beforeTime = new Date();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        values: {
          name,
        },
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      expect(params).toHaveLength(2);
      const afterTime = new Date();
      expect(params[0] as string).toBe(name);
      const createdAtValue = params[1] as Date;
      expect(beforeTime <= createdAtValue && createdAtValue <= afterTime).toBe(true);
    });

    it('should not override createdAt if schema.autoCreatedAt and value is defined', () => {
      const createdAt = faker.date.past();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        values: {
          name,
          createdAt,
        },
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      expect(params).toStrictEqual([name, createdAt]);
    });

    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        values: {
          name,
        },
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      expect(params).toHaveLength(2);
      const afterTime = new Date();
      expect(params[0] as string).toBe(name);
      const updatedAtValue = params[1] as Date;
      expect(beforeTime <= updatedAtValue && updatedAtValue <= afterTime).toBe(true);
    });

    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        values: {
          name,
          updatedAt,
        },
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      expect(params).toStrictEqual([name, updatedAt]);
    });

    it('should ignore collection properties', () => {
      const product = new Product();
      product.id = faker.number.int();
      const category = new Category();
      category.id = faker.number.int();

      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCollections.model as ModelMetadata<SimpleWithCollections>,
        values: {
          name,
          // @ts-expect-error - Collections are excluded from values type
          products: [product],
          categories: [category],
        },
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithCollections.model.tableName}" ("name") VALUES ($1) RETURNING "id","name"`);
      expect(params).toStrictEqual([name]);
    });

    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = new Store();
      store.id = faker.number.int();
      store.name = `store - ${faker.string.uuid()}`;

      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store,
        },
      });

      expect(query).toBe(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"`,
      );
      expect(params).toStrictEqual([name, [], store.id]);
    });

    it('should include schema if specified for model', () => {
      const name = faker.string.uuid();
      const { query } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithschema.model as ModelMetadata<SimpleWithSchema>,
        values: {
          name,
        },
      });

      expect(query).toBe(
        `INSERT INTO "${repositoriesByModelNameLowered.simplewithschema.model.schema}"."${repositoriesByModelNameLowered.simplewithschema.model.tableName}" ("name") VALUES ($1) RETURNING "id","name"`,
      );
    });

    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const name = faker.string.uuid();
      const bar = [
        {
          foo: faker.string.uuid(),
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

      expect(query).toBe(`INSERT INTO "${repositoriesByModelName.SimpleWithJson.model.tableName}" ("name","bar") VALUES ($1,$2::jsonb) RETURNING "id","name","bar","key_value" AS "keyValue"`);
      expect(params).toStrictEqual([name, JSON.stringify(bar)]);
    });

    it('should support inserting a single record and return records if returnRecords=true', () => {
      const storeId = faker.number.int();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      expect(query).toBe(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"`,
      );
      expect(params).toStrictEqual([name, [], storeId]);
    });

    it('should support inserting a single record and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId = faker.number.int();
      const name = faker.string.uuid();
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

      expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "name","id"`);
      expect(params).toStrictEqual([name, [], storeId]);
    });

    it('should support inserting a single record and not return records if returnRecords=false', () => {
      const storeId = faker.number.int();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3)`);
      expect(params).toStrictEqual([name, [], storeId]);
    });

    it('should support inserting multiple records and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId1 = faker.number.int();
      const name1 = faker.string.uuid();
      const storeId2 = faker.number.int();
      const name2 = faker.string.uuid();
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

      expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "store_id" AS "store","id"`);
      expect(params).toStrictEqual([name1, name2, [], [], storeId1, storeId2]);
    });

    it('should support inserting multiple records and return records if returnRecords=true', () => {
      const storeId1 = faker.number.int();
      const name1 = faker.string.uuid();
      const storeId2 = faker.number.int();
      const name2 = faker.string.uuid();
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

      expect(query).toBe(
        `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"`,
      );
      expect(params).toStrictEqual([name1, name2, [], [], storeId1, storeId2]);
    });

    it('should support inserting multiple records and not return records if returnRecords=false', () => {
      const storeId1 = faker.number.int();
      const name1 = faker.string.uuid();
      const storeId2 = faker.number.int();
      const name2 = faker.string.uuid();
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

      expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)`);
      expect(params).toStrictEqual([name1, name2, [], [], storeId1, storeId2]);
    });

    describe('onConflict', () => {
      describe('ignore', () => {
        it('should ignore conflicts for specified targets', () => {
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithStringId>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithstringid.model as ModelMetadata<SimpleWithStringId>,
            values: {
              name,
            },
            onConflict: {
              action: 'ignore',
              targets: ['name', 'otherId'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithstringid.model.tableName}" ("name") VALUES ($1) ON CONFLICT ("name","other_id") DO NOTHING RETURNING "id","name","other_id" AS "otherId"`,
          );
          expect(params).toStrictEqual([name]);
        });
      });

      describe('merge', () => {
        it('should increment version columns', () => {
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithVersion>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithversion.model as ModelMetadata<SimpleWithVersion>,
            values: {
              name,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithversion.model.tableName}" ("name","version") VALUES ($1,$2) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name","version"="version"+1 RETURNING "id","name","version"`,
          );
          expect(params).toStrictEqual([name, 1]);
        });

        it('should update non-primary and non-createDate columns if merge is undefined', () => {
          const beforeTime = new Date();
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithCreatedAtAndUpdatedAt>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithcreatedatandupdatedat.model as ModelMetadata<SimpleWithCreatedAtAndUpdatedAt>,
            values: {
              name,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithcreatedatandupdatedat.model.tableName}" ("name","created_at","updated_at") VALUES ($1,$2,$3) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name","updated_at"=EXCLUDED."updated_at" RETURNING "id","name","created_at" AS "createdAt","updated_at" AS "updatedAt"`,
          );

          expect(params).toHaveLength(3);
          const afterTime = new Date();
          expect(params[0] as string).toBe(name);
          const createdAtValue = params[1] as Date;
          expect(beforeTime <= createdAtValue && createdAtValue <= afterTime).toBe(true);
          const updatedAtValue = params[2] as Date;
          expect(beforeTime <= updatedAtValue && updatedAtValue <= afterTime).toBe(true);
        });

        it('should update primaryColumn if explicitly specified', () => {
          const id = faker.string.uuid();
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithStringId>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithstringid.model as ModelMetadata<SimpleWithStringId>,
            values: {
              id,
              name,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
              merge: ['id'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithstringid.model.tableName}" ("id","name") VALUES ($1,$2) ON CONFLICT ("name") DO UPDATE SET "id"=EXCLUDED."id" RETURNING "id","name","other_id" AS "otherId"`,
          );
          expect(params).toStrictEqual([id, name]);
        });

        it('should update createDateColumn if explicitly specified', () => {
          const beforeTime = new Date();
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithCreatedAt>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithcreatedat.model as ModelMetadata<SimpleWithCreatedAt>,
            values: {
              name,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
              merge: ['createdAt'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithcreatedat.model.tableName}" ("name","created_at") VALUES ($1,$2) ON CONFLICT ("name") DO UPDATE SET "created_at"=EXCLUDED."created_at" RETURNING "id","name","created_at" AS "createdAt"`,
          );

          expect(params).toHaveLength(2);
          const afterTime = new Date();
          expect(params[0] as string).toBe(name);
          const createdAtValue = params[1] as Date;
          expect(beforeTime <= createdAtValue && createdAtValue <= afterTime).toBe(true);
        });

        it('should limit columns to update if merge is defined', () => {
          const storeId = faker.number.int();
          const name = faker.string.uuid();
          const sku = faker.string.uuid();

          const { query, params } = sqlHelper.getInsertQueryAndParams<Product>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
            values: {
              store: storeId,
              name,
              sku,
            },
            onConflict: {
              action: 'merge',
              targets: ['store', 'sku'],
              merge: ['name', 'aliases'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.product.model.tableName}" ("name","sku","alias_names","store_id") VALUES ($1,$2,$3,$4) ON CONFLICT ("sku","store_id") DO UPDATE SET "name"=EXCLUDED."name","alias_names"=EXCLUDED."alias_names" RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store"`,
          );
          expect(params).toStrictEqual([name, sku, [], storeId]);
        });

        it('should ignore if merge is empty', () => {
          const beforeTime = new Date();
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithCreatedAt>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithcreatedat.model as ModelMetadata<SimpleWithCreatedAt>,
            values: {
              name,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
              merge: [],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithstringid.model.tableName}" ("name","created_at") VALUES ($1,$2) ON CONFLICT ("name") DO NOTHING RETURNING "id","name","created_at" AS "createdAt"`,
          );
          expect(params).toHaveLength(2);
          const afterTime = new Date();
          expect(params[0] as string).toBe(name);
          const createdAtValue = params[1] as Date;
          expect(beforeTime <= createdAtValue && createdAtValue <= afterTime).toBe(true);
        });

        it('should include where statement if defined for merge', () => {
          const id = faker.string.uuid();
          const name = faker.string.uuid();
          const otherId = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithStringId>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithstringid.model as ModelMetadata<SimpleWithStringId>,
            values: {
              id,
              name,
              otherId,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
              merge: {
                where: {
                  otherId: [null, ''],
                },
              },
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithstringid.model.tableName}" ("id","name","other_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name","other_id"=EXCLUDED."other_id" WHERE ("other_id" IS NULL OR "other_id"=$4) RETURNING "id","name","other_id" AS "otherId"`,
          );
          expect(params).toStrictEqual([id, name, otherId, '']);
        });

        it('should include where statement and merge explicit columns if defined', () => {
          const id = faker.string.uuid();
          const name = faker.string.uuid();
          const otherId = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithStringId>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithstringid.model as ModelMetadata<SimpleWithStringId>,
            values: {
              id,
              name,
              otherId,
            },
            onConflict: {
              action: 'merge',
              targets: ['name'],
              merge: {
                columns: ['name'],
                where: {
                  otherId: [null, ''],
                },
              },
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithstringid.model.tableName}" ("id","name","other_id") VALUES ($1,$2,$3) ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name" WHERE ("other_id" IS NULL OR "other_id"=$4) RETURNING "id","name","other_id" AS "otherId"`,
          );
          expect(params).toStrictEqual([id, name, otherId, '']);
        });

        it('should use a where clause on the index specification if provided on the targets', () => {
          const beforeTime = new Date();
          const name = faker.string.uuid();
          const { query, params } = sqlHelper.getInsertQueryAndParams<SimpleWithCreatedAt>({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithcreatedat.model as ModelMetadata<SimpleWithCreatedAt>,
            values: {
              name,
            },
            onConflict: {
              action: 'merge',
              targets: {
                columns: ['name'],
                where: { name: 'foo' },
              },
              merge: ['createdAt'],
            },
          });

          expect(query).toBe(
            `INSERT INTO "${repositoriesByModelNameLowered.simplewithcreatedat.model.tableName}" ("name","created_at") VALUES ($1,$2) ON CONFLICT ("name") WHERE "name"=$3 DO UPDATE SET "created_at"=EXCLUDED."created_at" RETURNING "id","name","created_at" AS "createdAt"`,
          );

          expect(params).toHaveLength(3);
          const afterTime = new Date();
          expect(params[0] as string).toBe(name);
          const createdAtValue = params[1] as Date;
          expect(beforeTime <= createdAtValue && createdAtValue <= afterTime).toBe(true);
          expect(params[2] as string).toBe('foo');
        });
      });
    });

    describe('maxLength', () => {
      it('should allow insert when maxLength set and providing null value', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              externalIdString: null,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name","external_id_string") VALUES ($1,$2,NULL)`);
        expect(params).toStrictEqual([itemId, itemName]);
      });

      it('should allow insert when maxLength set and providing undefined value', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              externalIdString: undefined,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name") VALUES ($1,$2)`);
        expect(params).toStrictEqual([itemId, itemName]);
      });

      it('should allow insert when maxLength set but column not required AND value not set', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name") VALUES ($1,$2)`);
        expect(params).toStrictEqual([itemId, itemName]);
      });

      it('should not enforce maxLength when not set for column', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const externalId = 'a'.repeat(1000);

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              externalIdNoMaxLength: externalId,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name","external_id_no_max_length") VALUES ($1,$2,$3)`);
        expect(params).toStrictEqual([itemId, itemName, externalId]);
      });

      it('should not enforce maxLength when set on unsupported column type', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const unrelatedValue = 12345; // maxLength: 2

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              unrelated: unrelatedValue,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name","unrelated") VALUES ($1,$2,$3)`);
        expect(params).toStrictEqual([itemId, itemName, unrelatedValue]);
      });

      it('should allow insert (string) when under maxLength', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const externalId = 'a'.repeat(5);

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              externalIdString: externalId,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name","external_id_string") VALUES ($1,$2,$3)`);
        expect(params).toStrictEqual([itemId, itemName, externalId]);
      });

      it('should throw error on insert (string) when above maxLength', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const externalId = 'a'.repeat(6);

        expect((): void => {
          sqlHelper.getInsertQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
            values: [
              {
                id: itemId,
                name: itemName,
                externalIdString: externalId,
              },
            ],
            returnRecords: false,
          });
        }).to.throw(QueryError, `Create statement for "${repositoriesByModelNameLowered.importeditem.model.name}" contains a value that exceeds maxLength on field: externalIdString`);
      });

      it('should allow insert (string[]) when under maxLength', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const externalIds = ['a'.repeat(10), 'b'.repeat(10)];

        const { query, params } = sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          values: [
            {
              id: itemId,
              name: itemName,
              externalIdStringArray: externalIds,
            },
          ],
          returnRecords: false,
        });

        expect(query).toBe(`INSERT INTO "${repositoriesByModelNameLowered.importeditem.model.tableName}" ("id","name","external_id_string_array") VALUES ($1,$2,$3)`);
        expect(params).toStrictEqual([itemId, itemName, externalIds]);
      });

      it('should throw error on insert (string[]) when above maxLength', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();
        const externalIds = ['a'.repeat(11), 'b'.repeat(10)];

        expect((): void => {
          sqlHelper.getInsertQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
            values: [
              {
                id: itemId,
                name: itemName,
                externalIdStringArray: externalIds,
              },
            ],
            returnRecords: false,
          });
        }).to.throw(QueryError, `Create statement for "${repositoriesByModelNameLowered.importeditem.model.name}" contains a value that exceeds maxLength on field: externalIdString`);
      });
    });
  });

  describe('#getUpdateQueryAndParams()', () => {
    it('should not set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCreatedAt.model as ModelMetadata<SimpleWithCreatedAt>,
        where: {},
        values: {
          name,
        },
      });

      expect(query).toBe(`UPDATE "${repositoriesByModelName.SimpleWithCreatedAt.model.tableName}" SET "name"=$1 RETURNING "id","name","created_at" AS "createdAt"`);
      expect(params).toStrictEqual([name]);
    });

    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        where: {},
        values: {
          name,
        },
      });

      expect(query).toBe(`UPDATE "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      expect(params).toHaveLength(2);
      const afterTime = new Date();
      expect(params[0] as string).toBe(name);
      const updatedAtValue = params[1] as Date;
      expect(beforeTime <= updatedAtValue && updatedAtValue <= afterTime).toBe(true);
    });

    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithUpdatedAt.model as ModelMetadata<SimpleWithUpdatedAt>,
        where: {},
        values: {
          name,
          updatedAt,
        },
      });

      expect(query).toBe(`UPDATE "${repositoriesByModelName.SimpleWithUpdatedAt.model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      expect(params).toStrictEqual([name, updatedAt]);
    });

    it('should ignore collection properties', () => {
      const product = new Product();
      product.id = faker.number.int();
      const category = new Category();
      category.id = faker.number.int();

      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelName.SimpleWithCollections.model as ModelMetadata<SimpleWithCollections>,
        where: {},
        values: {
          name,
          // @ts-expect-error - Collections are excluded from values type
          products: [product],
          categories: [category],
        },
      });

      expect(query).toBe(`UPDATE "${repositoriesByModelName.SimpleWithCollections.model.tableName}" SET "name"=$1 RETURNING "id","name"`);
      expect(params).toStrictEqual([name]);
    });

    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = new Store();
      store.id = faker.number.int();
      store.name = `store - ${faker.string.uuid()}`;

      const name = faker.string.uuid();
      const { query, params } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {},
        values: {
          name,
          store,
        },
      });

      expect(query).toBe(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([name, store.id]);
    });

    it('should include schema if specified for model', () => {
      const name = faker.string.uuid();
      const { query } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithschema.model as ModelMetadata<SimpleWithSchema>,
        where: {},
        values: {
          name,
        },
      });

      expect(query).toBe(
        `UPDATE "${repositoriesByModelNameLowered.simplewithschema.model.schema}"."${repositoriesByModelNameLowered.simplewithschema.model.tableName}" SET "name"=$1 RETURNING "id","name"`,
      );
    });

    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const name = faker.string.uuid();
      const bar = [
        {
          foo: faker.string.uuid(),
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

      expect(query).toBe(`UPDATE "${repositoriesByModelName.SimpleWithJson.model.tableName}" SET "name"=$1,"bar"=$2::jsonb RETURNING "id","name","bar","key_value" AS "keyValue"`);
      expect(params).toStrictEqual([name, JSON.stringify(bar)]);
    });

    it('should include where statement if defined', () => {
      const store = {
        id: faker.number.int(),
        name: `store - ${faker.string.uuid()}`,
      };

      const name = faker.string.uuid();
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

      expect(query).toBe(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1 WHERE "store_id"=$2 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([name, store.id]);
    });

    it('should return records if returnRecords=true', () => {
      const productId = faker.number.int();
      const storeId = faker.number.int();
      const name = faker.string.uuid();
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

      expect(query).toBe(
        `UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([name, storeId, productId]);
    });

    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.number.int();
      const storeId = faker.number.int();
      const name = faker.string.uuid();
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

      expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "name","id"`);
      expect(params).toStrictEqual([name, storeId, productId]);
    });

    it('should not return records if returnRecords=false', () => {
      const productId = faker.number.int();
      const storeId = faker.number.int();
      const name = faker.string.uuid();
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

      expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.product.model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3`);
      expect(params).toStrictEqual([name, storeId, productId]);
    });

    describe('maxLength', () => {
      it('should allow update when maxLength set and providing null', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            name: itemName,
            externalIdString: null,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "name"=$1,"external_id_string"=NULL WHERE "id"=$2`);
        expect(params).toStrictEqual([itemName, itemId]);
      });

      it('should allow update when maxLength set and providing undefined', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            name: itemName,
            externalIdString: undefined,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "name"=$1,"external_id_string"=NULL WHERE "id"=$2`);
        expect(params).toStrictEqual([itemName, itemId]);
      });

      it('should allow update when maxLength set but column not required AND value not set', () => {
        const itemId = faker.string.uuid();
        const itemName = faker.string.uuid();

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            name: itemName,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "name"=$1 WHERE "id"=$2`);
        expect(params).toStrictEqual([itemName, itemId]);
      });

      it('should not enforce maxLength when not set for column', () => {
        const itemId = faker.string.uuid();
        const externalId = 'a'.repeat(1000);

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            externalIdNoMaxLength: externalId,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "external_id_no_max_length"=$1 WHERE "id"=$2`);
        expect(params).toStrictEqual([externalId, itemId]);
      });

      it('should not enforce maxLength when set on unsupported column type', () => {
        const itemId = faker.string.uuid();
        const unrelatedValue = 12345; // maxLength: 2

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            unrelated: unrelatedValue,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "unrelated"=$1 WHERE "id"=$2`);
        expect(params).toStrictEqual([unrelatedValue, itemId]);
      });

      it('should allow update (string) when under maxLength', () => {
        const itemId = faker.string.uuid();
        const externalId = 'a'.repeat(5);

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            externalIdString: externalId,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "external_id_string"=$1 WHERE "id"=$2`);
        expect(params).toStrictEqual([externalId, itemId]);
      });

      it('should throw error on update (string) when above maxLength', () => {
        const itemId = faker.string.uuid();
        const externalId = 'a'.repeat(6);

        expect((): void => {
          sqlHelper.getUpdateQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
            where: {
              id: itemId,
            },
            values: {
              externalIdString: externalId,
            },
            returnRecords: false,
          });
        }).to.throw(QueryError, `Update statement for "${repositoriesByModelNameLowered.importeditem.model.name}" contains a value that exceeds maxLength on field: externalIdString`);
      });

      it('should allow update (string[]) when under maxLength', () => {
        const itemId = faker.string.uuid();
        const externalIds = ['a'.repeat(10), 'b'.repeat(10)];

        const { query, params } = sqlHelper.getUpdateQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
          where: {
            id: itemId,
          },
          values: {
            externalIdStringArray: externalIds,
          },
          returnRecords: false,
        });

        expect(query).toBe(`UPDATE "${repositoriesByModelNameLowered.importeditem.model.tableName}" SET "external_id_string_array"=$1 WHERE "id"=$2`);
        expect(params).toStrictEqual([externalIds, itemId]);
      });

      it('should throw error on update (string[]) when above maxLength', () => {
        const itemId = faker.string.uuid();
        const externalIds = ['a'.repeat(11), 'b'.repeat(10)];

        expect((): void => {
          sqlHelper.getUpdateQueryAndParams({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.importeditem.model as ModelMetadata<ImportedItem>,
            where: {
              id: itemId,
            },
            values: {
              externalIdStringArray: externalIds,
            },
            returnRecords: false,
          });
        }).to.throw(QueryError, `Update statement for "${repositoriesByModelNameLowered.importeditem.model.name}" contains a value that exceeds maxLength on field: externalIdString`);
      });
    });
  });

  describe('#getDeleteQueryAndParams()', () => {
    it('should delete all records if no where statement is defined', () => {
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
      });

      expect(query).toBe(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([]);
    });

    it('should include where statement if defined', () => {
      const store = {
        id: faker.number.int(),
        name: `store - ${faker.string.uuid()}`,
      };

      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          store,
        },
      });

      expect(query).toBe(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" WHERE "store_id"=$1 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([store.id]);
    });

    it('should include schema if specified for model', () => {
      const { query } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithschema.model as ModelMetadata<SimpleWithSchema>,
      });

      expect(query).toBe(`DELETE FROM "${repositoriesByModelNameLowered.simplewithschema.model.schema}"."${repositoriesByModelNameLowered.simplewithschema.model.tableName}" RETURNING "id","name"`);
    });

    it('should return records if returnRecords=true', () => {
      const productId = faker.number.int();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          id: productId,
        },
        returnRecords: true,
      });

      expect(query).toBe(
        `DELETE FROM "${repositoriesByModelNameLowered.productwithcreatedat.model.tableName}" WHERE "id"=$1 RETURNING "id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`,
      );
      expect(params).toStrictEqual([productId]);
    });

    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.number.int();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      expect(query).toBe(`DELETE FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "id"=$1 RETURNING "name","id"`);
      expect(params).toStrictEqual([productId]);
    });

    it('should not return records if returnRecords=false', () => {
      const productId = faker.number.int();
      const { query, params } = sqlHelper.getDeleteQueryAndParams({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id: productId,
        },
        returnRecords: false,
      });

      expect(query).toBe(`DELETE FROM "${repositoriesByModelNameLowered.product.model.tableName}" WHERE "id"=$1`);
      expect(params).toStrictEqual([productId]);
    });
  });

  describe('#getColumnsToSelect()', () => {
    it('should include all columns if select is undefined (explicit)', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        select: undefined,
      });

      expect(query).toBe('"id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });

    it('should include all columns if select is undefined (implicit)', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
      });

      expect(query).toBe('"id","name","sku","location","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });

    it('should include primaryKey column if select is empty', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        select: [],
      });

      expect(query).toBe('"id"');
    });

    it('should include primaryKey column if select does not include it', () => {
      const query = sqlHelper.getColumnsToSelect({
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        select: ['name'],
      });

      expect(query).toBe('"name","id"');
    });
  });

  describe('#buildWhereStatement()', () => {
    it('should return empty if where is undefined', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
      });

      expect(whereStatement).toBeUndefined();
      expect(params).toStrictEqual([]);
    });

    it('should throw if query value is undefined', () => {
      expect((): void => {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            store: undefined,
          },
        });
      }).to.throw(QueryError, `Attempting to query with an undefined value. store on ${repositoriesByModelNameLowered.product.model.name}`);
    });

    it('should use column name if defined', () => {
      const storeId = faker.number.int();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store: storeId,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "store_id"=$1');
      expect(params).toStrictEqual([storeId]);
    });

    it('should use property name if columnName is not defined', () => {
      const name = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "name"=$1');
      expect(params).toStrictEqual([name]);
    });

    it('should handle startsWith', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" ILIKE $1');
      expect(params).toStrictEqual([`${name}%`]);
    });

    it('should handle startsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE ("name" ILIKE $1 OR "name" ILIKE $2)');
      expect(params).toStrictEqual([`${name1}%`, `${name2}%`]);
    });

    it('should handle endsWith', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" ILIKE $1');
      expect(params).toStrictEqual([`%${name}`]);
    });

    it('should handle endsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE ("name" ILIKE $1 OR "name" ILIKE $2)');
      expect(params).toStrictEqual([`%${name1}`, `%${name2}`]);
    });

    it('should handle contains', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" ILIKE $1');
      expect(params).toStrictEqual([`%${name}%`]);
    });

    it('should handle contains with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE ("name" ILIKE $1 OR "name" ILIKE $2)');
      expect(params).toStrictEqual([`%${name1}%`, `%${name2}%`]);
    });

    it('should handle like', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" ILIKE $1');
      expect(params).toStrictEqual([name]);
    });

    it('should handle not like', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" NOT ILIKE $1');
      expect(params).toStrictEqual([name]);
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
      expect(whereStatement).toBe('WHERE "name" = \'\'');
      expect(params).toStrictEqual([]);
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
      expect(whereStatement).toBe('WHERE "name" != \'\'');
      expect(params).toStrictEqual([]);
    });

    it('should handle like with array with a single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" ILIKE $1');
      expect(params).toStrictEqual([name]);
    });

    it('should handle not like with array with a single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" NOT ILIKE $1');
      expect(params).toStrictEqual([name]);
    });

    it('should handle like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE ("name" ILIKE $1 OR "name" ILIKE $2)');
      expect(params).toStrictEqual([name1, name2]);
    });

    it('should handle like with an array of null, empty string, and single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE ("name" IS NULL OR "name" = \'\' OR "name" ILIKE $1)');
      expect(params).toStrictEqual([name]);
    });

    it('should handle not like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" NOT ILIKE $1 AND "name" NOT ILIKE $2');
      expect(params).toStrictEqual([name1, name2]);
    });

    it('should handle not like with an array of null, empty string, and single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "name" IS NOT NULL AND "name" != \'\' AND "name" NOT ILIKE $1');
      expect(params).toStrictEqual([name]);
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
      expect(whereStatement).toBe('WHERE 1<>1');
      expect(params).toStrictEqual([]);
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
      expect(whereStatement).toBe('WHERE 1=1');
      expect(params).toStrictEqual([]);
    });

    it('should handle like with array column and array with a single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      expect(params).toStrictEqual([name]);
    });

    it('should handle not like with array column and array with a single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      expect(params).toStrictEqual([name]);
    });

    it('should handle like with array column and single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      expect(params).toStrictEqual([name]);
    });

    it('should handle not like with array column and a single value', () => {
      const name = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      expect(params).toStrictEqual([name]);
    });

    it('should handle like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe(
        'WHERE (EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1) OR EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $2))',
      );
      expect(params).toStrictEqual([name1, name2]);
    });

    it('should handle not like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.string.uuid();
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
      expect(whereStatement).toBe(
        'WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1) AND NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $2)',
      );
      expect(params).toStrictEqual([name1, name2]);
    });

    describe('JSON column containment', () => {
      it('should handle contains with an object value on JSON column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              contains: { content: 'foo' },
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "bar"@>$1::jsonb');
        expect(params).toStrictEqual([{ content: 'foo' }]);
      });

      it('should handle negated contains with an object value on JSON column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              '!': {
                contains: { content: 'foo' },
              },
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE NOT "bar"@>$1::jsonb');
        expect(params).toStrictEqual([{ content: 'foo' }]);
      });

      it('should handle contains with an array of object values on JSON column (OR)', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              contains: [{ content: 'foo' }, { content: 'bar' }],
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE ("bar"@>$1::jsonb OR "bar"@>$2::jsonb)');
        expect(params).toStrictEqual([{ content: 'foo' }, { content: 'bar' }]);
      });

      it('should handle negated contains with an array of object values on JSON column (AND)', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              '!': {
                contains: [{ content: 'foo' }, { content: 'bar' }],
              },
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE NOT "bar"@>$1::jsonb AND NOT "bar"@>$2::jsonb');
        expect(params).toStrictEqual([{ content: 'foo' }, { content: 'bar' }]);
      });

      it('should handle contains with an empty object on JSON column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              contains: {},
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "bar"@>$1::jsonb');
        expect(params).toStrictEqual([{}]);
      });

      it('should handle contains with null on JSON column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              contains: null,
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "bar" IS NULL');
        expect(params).toStrictEqual([]);
      });

      it('should handle contains with an empty array on JSON column', () => {
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
          where: {
            bar: {
              contains: [],
            },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE 1<>1');
        expect(params).toStrictEqual([]);
      });

      it('should throw error for like operator on JSON column', () => {
        expect((): void => {
          sqlHelper.buildWhereStatement({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
            where: {
              bar: {
                like: 'foo',
              },
            } as WhereQuery<SimpleWithJson>,
          });
        }).to.throw(QueryError, '"like" operator is not supported for JSON columns');
      });

      it('should throw error for startsWith operator on JSON column', () => {
        expect((): void => {
          sqlHelper.buildWhereStatement({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
            where: {
              bar: {
                startsWith: 'foo',
              },
            } as WhereQuery<SimpleWithJson>,
          });
        }).to.throw(QueryError, '"like" operator is not supported for JSON columns');
      });

      it('should throw error for endsWith operator on JSON column', () => {
        expect((): void => {
          sqlHelper.buildWhereStatement({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.simplewithjson.model as ModelMetadata<SimpleWithJson>,
            where: {
              bar: {
                endsWith: 'foo',
              },
            } as WhereQuery<SimpleWithJson>,
          });
        }).to.throw(QueryError, '"like" operator is not supported for JSON columns');
      });
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
      expect(whereStatement).toBe('WHERE "created_at">$1');
      expect(params).toStrictEqual([now]);
    });

    it('should handle date range', () => {
      const now = new Date();
      const future = faker.date.future();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.productwithcreatedat.model as ModelMetadata<ProductWithCreatedAt>,
        where: {
          createdAt: {
            '>=': now,
            '<': future,
          },
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "created_at">=$1 AND "created_at"<$2');
      expect(params).toStrictEqual([now, future]);
    });

    it('should handle or', () => {
      const name = faker.string.uuid();
      const store = faker.number.int();
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
      expect(whereStatement).toBe('WHERE (("name"=$1) OR ("name"<>$2 AND "store_id"=$3))');
      expect(params).toStrictEqual([name, name, store]);
    });

    it('should throw for empty or', () => {
      expect((): void => {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            or: [],
          },
        });
      }).to.throw(QueryError, `WHERE statement is unexpectedly empty.`);
    });

    it('should handle or with a int field and a string array field', () => {
      const alias1 = faker.string.uuid();
      const alias2 = faker.string.uuid();
      const alias3 = faker.string.uuid();
      const store = faker.number.int();
      const store2 = faker.number.int();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          or: [
            {
              store,
              aliases: alias1,
            },
            {
              store,
              aliases: alias2,
            },
            {
              store: store2,
              aliases: alias3,
            },
          ],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE (("store_id"=$1 AND $2=ANY("alias_names")) OR ("store_id"=$3 AND $4=ANY("alias_names")) OR ("store_id"=$5 AND $6=ANY("alias_names")))');
      expect(params).toStrictEqual([store, alias1, store, alias2, store2, alias3]);
    });

    it('should handle or with two string fields', () => {
      const name = faker.string.uuid();
      const name1 = faker.string.uuid();
      const location1 = faker.string.uuid();
      const location2 = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          or: [
            {
              name,
              location: location1,
            },
            {
              name: name1,
              location: location2,
            },
          ],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE (("name"=$1 AND "location"=$2) OR ("name"=$3 AND "location"=$4))');
      expect(params).toStrictEqual([name, location1, name1, location2]);
    });

    it('should handle mixed or/and constraints', () => {
      const id = faker.number.int();
      const name = faker.string.uuid();
      const store = faker.number.int();
      const sku = faker.string.uuid();
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
      expect(whereStatement).toBe('WHERE "id"=$1 AND (("name"=$2) OR ("name"<>$3 AND "store_id"=$4)) AND "sku"=$5');
      expect(params).toStrictEqual([id, name, name, store, sku]);
    });

    it('should handle and', () => {
      const name = faker.string.uuid();
      const sku = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          and: [
            {
              name,
            },
            {
              sku,
            },
          ],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE (("name"=$1) AND ("sku"=$2))');
      expect(params).toStrictEqual([name, sku]);
    });

    it('should throw for empty and', () => {
      expect((): void => {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            and: [],
          },
        });
      }).to.throw(QueryError, `WHERE statement is unexpectedly empty.`);
    });

    it('should handle and with nested or', () => {
      const name1 = faker.string.uuid();
      const name2 = faker.string.uuid();
      const sku1 = faker.string.uuid();
      const sku2 = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          and: [
            {
              or: [{ name: name1 }, { name: name2 }],
            },
            {
              or: [{ sku: sku1 }, { sku: sku2 }],
            },
          ],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE (((("name"=$1) OR ("name"=$2))) AND ((("sku"=$3) OR ("sku"=$4))))');
      expect(params).toStrictEqual([name1, name2, sku1, sku2]);
    });

    it('should handle or with nested and', () => {
      const name1 = faker.string.uuid();
      const sku1 = faker.string.uuid();
      const name2 = faker.string.uuid();
      const sku2 = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          or: [
            {
              and: [{ name: name1 }, { sku: sku1 }],
            },
            {
              and: [{ name: name2 }, { sku: sku2 }],
            },
          ],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE (((("name"=$1) AND ("sku"=$2))) OR ((("name"=$3) AND ("sku"=$4))))');

      expect(params).toStrictEqual([name1, sku1, name2, sku2]);
    });

    it('should handle and mixed with regular conditions', () => {
      const id = faker.number.int();
      const name = faker.string.uuid();
      const sku = faker.string.uuid();
      const location = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          id,
          and: [
            {
              name,
            },
            {
              sku,
            },
          ],
          location,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "id"=$1 AND (("name"=$2) AND ("sku"=$3)) AND "location"=$4');
      expect(params).toStrictEqual([id, name, sku, location]);
    });

    it('should handle single item and array', () => {
      const name = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          and: [{ name }],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE ("name"=$1)');
      expect(params).toStrictEqual([name]);
    });

    it('should treat string type with array values as an =ANY() statement', () => {
      const name = [faker.string.uuid(), faker.string.uuid()];
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "name"=ANY($1::TEXT[])');
      expect(params).toStrictEqual([name]);
    });

    it('should treat uuid type with array values as an =ANY() statement', () => {
      const id = [faker.string.uuid(), faker.string.uuid()];
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithuuid.model as ModelMetadata<SimpleWithUUID>,
        where: {
          id,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "id"=ANY($1::UUID[])');
      expect(params).toStrictEqual([id]);
    });

    it('should treat uuid type with string values as an = statement', () => {
      const id = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.simplewithuuid.model as ModelMetadata<SimpleWithUUID>,
        where: {
          id,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "id"=$1');
      expect(params).toStrictEqual([id]);
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
      expect(whereStatement).toBe('WHERE "int_column"=ANY($1::INTEGER[])');
      expect(params).toStrictEqual([values]);
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
      expect(whereStatement).toBe('WHERE "float_column"=ANY($1::NUMERIC[])');
      expect(params).toStrictEqual([values]);
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
        expect(whereStatement).toBe('WHERE "array_column"=\'{}\'');
        expect(params).toStrictEqual([]);
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
        expect(whereStatement).toBe('WHERE ("array_column" IS NULL OR "array_column"=\'{}\')');
        expect(params).toStrictEqual([]);
      });

      it('should handle comparing array type with single value as =ANY()', () => {
        const value = faker.string.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: value,
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE $1=ANY("array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with array of a single value as =ANY()', () => {
        const value = faker.string.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: [value],
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE $1=ANY("array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with negated single value as <>ALL()', () => {
        const value = faker.string.uuid();
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
        expect(whereStatement).toBe('WHERE $1<>ALL("array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with negated array of a single value as <>ALL()', () => {
        const value = faker.string.uuid();
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
        expect(whereStatement).toBe('WHERE $1<>ALL("array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with array value as separate =ANY() statements', () => {
        const values = [faker.string.uuid(), faker.string.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            arrayColumn: values,
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE ($1=ANY("array_column") OR $2=ANY("array_column"))');
        expect(params).toStrictEqual([values[0], values[1]]);
      });

      it('should handle comparing array type with negated array value as separate <>ALL() statements', () => {
        const values = [faker.string.uuid(), faker.string.uuid()];
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
        expect(whereStatement).toBe('WHERE $1<>ALL("array_column") AND $2<>ALL("array_column")');
        expect(params).toStrictEqual([values[0], values[1]]);
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
        expect(whereStatement).toBe('WHERE "string_array_column"=\'{}\'');
        expect(params).toStrictEqual([]);
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
        expect(whereStatement).toBe('WHERE ("string_array_column" IS NULL OR "string_array_column"=\'{}\')');
        expect(params).toStrictEqual([]);
      });

      it('should handle comparing array type with single value as =ANY()', () => {
        const value = faker.string.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: value,
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE $1=ANY("string_array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with array of a single value as =ANY()', () => {
        const value = faker.string.uuid();
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: [value],
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE $1=ANY("string_array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with negated single value as <>ALL()', () => {
        const value = faker.string.uuid();
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
        expect(whereStatement).toBe('WHERE $1<>ALL("string_array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with negated array of a single value as <>ALL()', () => {
        const value = faker.string.uuid();
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
        expect(whereStatement).toBe('WHERE $1<>ALL("string_array_column")');
        expect(params).toStrictEqual([value]);
      });

      it('should handle comparing array type with array value as separate =ANY() statements', () => {
        const values = [faker.string.uuid(), faker.string.uuid()];
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            stringArrayColumn: values,
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE ($1=ANY("string_array_column") OR $2=ANY("string_array_column"))');
        expect(params).toStrictEqual([values[0], values[1]]);
      });

      it('should handle comparing array type with negated array value as separate <>ALL() statements', () => {
        const values = [faker.string.uuid(), faker.string.uuid()];
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
        expect(whereStatement).toBe('WHERE $1<>ALL("string_array_column") AND $2<>ALL("string_array_column")');
        expect(params).toStrictEqual([values[0], values[1]]);
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
      expect(whereStatement).toBe('WHERE 1<>1');
      expect(params).toStrictEqual([]);
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
      expect(whereStatement).toBe('WHERE 1=1');
      expect(params).toStrictEqual([]);
    });

    it('should handle single value array', () => {
      const name = faker.string.uuid();
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: [name],
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "name"=$1');
      expect(params).toStrictEqual([name]);
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
      expect(whereStatement).toBe('WHERE ("name" IS NULL OR "name"=$1)');
      expect(params).toStrictEqual(['']);
    });

    it('should treat negation of array value as an <>ALL() statement', () => {
      const name = [faker.string.uuid(), faker.string.uuid()];
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
      expect(whereStatement).toBe('WHERE "name"<>ALL($1::TEXT[])');
      expect(params).toStrictEqual([name]);
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
      expect(whereStatement).toBe('WHERE 1=1');
      expect(params).toStrictEqual([]);
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
      expect(whereStatement).toBe('WHERE "name" IS NOT NULL AND "name"<>$1');
      expect(params).toStrictEqual(['']);
    });

    it('should use primaryKey if hydrated object is passed as a query value', () => {
      const store = {
        id: faker.number.int(),
      };

      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          store,
        },
      });

      assert(whereStatement);
      expect(whereStatement).toBe('WHERE "store_id"=$1');
      expect(params).toStrictEqual([store.id]);
    });
  });

  describe('#buildOrderStatement()', () => {
    it('should return empty if there are no orders defined', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [],
      });

      expect(result).toBe('');
    });

    it('should handle single string order with implicit direction', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'name',
          },
        ],
      });

      expect(result).toBe('ORDER BY "name"');
    });

    it('should handle single string order with implicit direction and explicit columnName', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'intColumn',
          },
        ],
      });

      expect(result).toBe('ORDER BY "int_column"');
    });

    it('should handle single string order with explicit desc direction', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'name',
            descending: true,
          },
        ],
      });

      expect(result).toBe('ORDER BY "name" DESC');
    });

    it('should handle single string order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
        sorts: [
          {
            propertyName: 'intColumn',
            descending: true,
          },
        ],
      });

      expect(result).toBe('ORDER BY "int_column" DESC');
    });

    it('should handle multiple string order', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
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

      expect(result).toBe('ORDER BY "int_column" DESC,"name"');
    });

    it('should handle dot-notation for joined table column', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        sorts: [
          {
            propertyName: 'store.name' as 'name',
          },
        ],
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
      });

      expect(result).toBe('ORDER BY "store"."name"');
    });

    it('should handle dot-notation with custom alias', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        sorts: [
          {
            propertyName: 'primaryStore.name' as 'name',
            descending: true,
          },
        ],
        joins: [
          {
            propertyName: 'store',
            alias: 'primaryStore',
            type: 'inner',
          },
        ],
      });

      expect(result).toBe('ORDER BY "primaryStore"."name" DESC');
    });

    it('should handle mixed regular and dot-notation sorts', () => {
      const result = sqlHelper.buildOrderStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        sorts: [
          {
            propertyName: 'store.name' as 'name',
          },
          {
            propertyName: 'name',
            descending: true,
          },
        ],
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
      });

      expect(result).toBe('ORDER BY "store"."name","name" DESC');
    });
  });

  describe('#buildJoinClauses()', () => {
    it('should return empty string when no joins provided', () => {
      const result = sqlHelper.buildJoinClauses({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        joins: [],
        params: [],
      });

      expect(result).toBe('');
    });

    it('should generate INNER JOIN clause for model relationship', () => {
      const result = sqlHelper.buildJoinClauses({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
        params: [],
      });

      expect(result).toBe(' INNER JOIN "stores" AS "store" ON "products"."store_id"="store"."id"');
    });

    it('should generate LEFT JOIN clause for model relationship', () => {
      const result = sqlHelper.buildJoinClauses({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'left',
          },
        ],
        params: [],
      });

      expect(result).toBe(' LEFT JOIN "stores" AS "store" ON "products"."store_id"="store"."id"');
    });

    it('should use custom alias in join clause', () => {
      const result = sqlHelper.buildJoinClauses({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'primaryStore',
            type: 'inner',
          },
        ],
        params: [],
      });

      expect(result).toBe(' INNER JOIN "stores" AS "primaryStore" ON "products"."store_id"="primaryStore"."id"');
    });

    it('should include additional ON constraints for LEFT JOIN', () => {
      const params: unknown[] = [];
      const result = sqlHelper.buildJoinClauses({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'left',
            on: {
              name: 'Acme',
            } as WhereQuery<Store>,
          },
        ],
        params,
      });

      expect(result).toBe(' LEFT JOIN "stores" AS "store" ON "products"."store_id"="store"."id" AND "store"."name"=$1');
      expect(params).toStrictEqual(['Acme']);
    });

    it('should throw QueryError for non-existent property', () => {
      let thrownError: Error | null = null;

      try {
        sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          joins: [
            {
              propertyName: 'nonExistent',
              alias: 'nonExistent',
              type: 'inner',
            },
          ],
          params: [],
        });
      } catch (ex) {
        thrownError = ex as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain('Unable to find property "nonExistent"');
    });

    it('should throw QueryError for non-relationship property', () => {
      let thrownError: Error | null = null;

      try {
        sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          joins: [
            {
              propertyName: 'name',
              alias: 'name',
              type: 'inner',
            },
          ],
          params: [],
        });
      } catch (ex) {
        thrownError = ex as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain('is not a relationship and cannot be joined');
    });
  });

  describe('dot-notation in where clauses with joins', () => {
    it('should handle dot-notation for simple equality on joined table', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          'store.name': 'Acme',
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "store"."name"=$1');
      expect(params).toStrictEqual(['Acme']);
    });

    it('should handle dot-notation with like operator on joined table', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          'store.name': { like: '%mart%' },
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'left',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "store"."name" ILIKE $1');
      expect(params).toStrictEqual(['%mart%']);
    });

    it('should handle dot-notation with custom join alias', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          'primaryStore.name': 'Acme',
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'primaryStore',
            type: 'inner',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "primaryStore"."name"=$1');
      expect(params).toStrictEqual(['Acme']);
    });

    it('should handle multiple dot-notation properties', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          name: 'Widget',
          'store.name': 'Acme',
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "name"=$1 AND "store"."name"=$2');
      expect(params).toStrictEqual(['Widget', 'Acme']);
    });

    it('should handle dot-notation with comparison operators', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          'store.id': { '>': 5 },
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'inner',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "store"."id">$1');
      expect(params).toStrictEqual([5]);
    });

    it('should handle dot-notation with null value', () => {
      const { whereStatement, params } = sqlHelper.buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
        where: {
          'store.name': null,
        } as WhereQuery<Product>,
        joins: [
          {
            propertyName: 'store',
            alias: 'store',
            type: 'left',
          },
        ],
      });

      expect(whereStatement!).toBe('WHERE "store"."name" IS NULL');
      expect(params).toStrictEqual([]);
    });

    it('should throw error when using dot-notation without corresponding join', () => {
      let thrownError: Error | null = null;

      try {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            'store.name': 'Acme',
          } as WhereQuery<Product>,
        });
      } catch (ex) {
        thrownError = ex as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain('Cannot use dot notation "store.name" without a join');
    });

    it('should throw error when join alias does not match', () => {
      let thrownError: Error | null = null;

      try {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            'nonExistentAlias.name': 'Acme',
          } as WhereQuery<Product>,
          joins: [
            {
              propertyName: 'store',
              alias: 'store',
              type: 'inner',
            },
          ],
        });
      } catch (ex) {
        thrownError = ex as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain('Cannot find join for "nonExistentAlias"');
    });

    it('should throw error when property does not exist on joined model', () => {
      let thrownError: Error | null = null;

      try {
        sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            'store.nonExistentProperty': 'Acme',
          } as WhereQuery<Product>,
          joins: [
            {
              propertyName: 'store',
              alias: 'store',
              type: 'inner',
            },
          ],
        });
      } catch (ex) {
        thrownError = ex as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain('Unable to find property "nonExistentProperty" on model');
    });
  });

  describe('subqueries', () => {
    describe('WHERE IN with subquery', () => {
      it('should generate IN subquery', () => {
        const storeSubquery = subquery(repositoriesByModelNameLowered.store as IRepository<Store>)
          .select(['id'])
          .where({ name: 'Acme' });

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            store: { in: storeSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Acme']);
      });

      it('should generate NOT IN subquery with negation', () => {
        const storeSubquery = subquery(repositoriesByModelNameLowered.store as IRepository<Store>)
          .select(['id'])
          .where({ name: 'Inactive' });

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            store: { '!': { in: storeSubquery } },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "store_id" NOT IN (SELECT "id" FROM "stores" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Inactive']);
      });

      it('should generate IN subquery without select (defaults to 1)', () => {
        const storeSubquery = subquery(repositoriesByModelNameLowered.store as IRepository<Store>).where({ name: 'Test' });

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            store: { in: storeSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "store_id" IN (SELECT 1 FROM "stores" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Test']);
      });
    });

    describe('WHERE EXISTS with subquery', () => {
      it('should generate EXISTS subquery', () => {
        const productSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>).where({ name: 'Widget' });

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          where: {
            exists: productSubquery,
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE EXISTS (SELECT 1 FROM "products" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Widget']);
      });

      it('should generate NOT EXISTS subquery with negation', () => {
        const productSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>).where({ name: 'Discontinued' });

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          where: {
            '!': { exists: productSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE NOT EXISTS (SELECT 1 FROM "products" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Discontinued']);
      });
    });

    describe('scalar subqueries with aggregates', () => {
      it('should generate scalar subquery with AVG', () => {
        const avgSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .where({ name: 'test' })
          .avg('intColumn');

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            intColumn: { '>': avgSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "int_column">(SELECT AVG("int_column") FROM "kitchen_sink" WHERE "name"=$1)');
        expect(params).toStrictEqual(['test']);
      });

      it('should generate scalar subquery with COUNT', () => {
        const countSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .where({ name: 'Popular' })
          .count();

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            intColumn: { '>=': countSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "int_column">=(SELECT COUNT(*) FROM "products" WHERE "name"=$1)');
        expect(params).toStrictEqual(['Popular']);
      });

      it('should generate scalar subquery with SUM', () => {
        const sumSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>).sum('intColumn');

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            intColumn: { '<': sumSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "int_column"<(SELECT SUM("int_column") FROM "kitchen_sink")');
        expect(params).toStrictEqual([]);
      });

      it('should generate scalar subquery with MAX', () => {
        const maxSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>).max('intColumn');

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            intColumn: { '<=': maxSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "int_column"<=(SELECT MAX("int_column") FROM "kitchen_sink")');
        expect(params).toStrictEqual([]);
      });

      it('should generate scalar subquery with MIN', () => {
        const minSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>).min('intColumn');

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.kitchensink.model as ModelMetadata<KitchenSink>,
          where: {
            intColumn: { '>': minSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "int_column">(SELECT MIN("int_column") FROM "kitchen_sink")');
        expect(params).toStrictEqual([]);
      });
    });

    describe('subquery with sort and limit', () => {
      it('should generate subquery with ORDER BY and LIMIT', () => {
        const storeSubquery = subquery(repositoriesByModelNameLowered.store as IRepository<Store>)
          .select(['id'])
          .where({ name: { like: 'A%' } })
          .sort('name asc')
          .limit(10);

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            store: { in: storeSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "store_id" IN (SELECT "id" FROM "stores" WHERE "name" ILIKE $1 ORDER BY "name" LIMIT 10)');
        expect(params).toStrictEqual(['A%']);
      });
    });

    describe('combining subqueries with other conditions', () => {
      it('should combine subquery with regular where conditions', () => {
        const storeSubquery = subquery(repositoriesByModelNameLowered.store as IRepository<Store>)
          .select(['id'])
          .where({ name: 'Premium' });

        const productName = 'Widget';
        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.product.model as ModelMetadata<Product>,
          where: {
            name: productName,
            store: { in: storeSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "name"=$1 AND "store_id" IN (SELECT "id" FROM "stores" WHERE "name"=$2)');
        expect(params).toStrictEqual([productName, 'Premium']);
      });
    });

    describe('subquery joins', () => {
      it('should generate INNER JOIN to subquery with COUNT aggregate', () => {
        const productCountSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: productCountSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store"');
      });

      it('should generate LEFT JOIN to subquery', () => {
        const productCountSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: productCountSubquery,
              alias: 'productStats',
              type: 'left',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' LEFT JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store"');
      });

      it('should generate subquery join with SUM aggregate', () => {
        const sumSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select(['id', (sb): SelectAggregateExpression => sb.sum('intColumn').as('total')])
          .groupBy(['id']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: sumSubquery,
              alias: 'totals',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "id",SUM("int_column") AS "total" FROM "kitchen_sink" GROUP BY "id") AS "totals" ON "stores"."id"="totals"."id"');
      });

      it('should generate subquery join with COUNT DISTINCT', () => {
        const distinctCountSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count('name').distinct().as('uniqueNames')])
          .groupBy(['store']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: distinctCountSubquery,
              alias: 'stats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "store_id" AS "store",COUNT(DISTINCT "name") AS "uniqueNames" FROM "products" GROUP BY "store_id") AS "stats" ON "stores"."id"="stats"."store"');
      });

      it('should generate subquery join with WHERE clause', () => {
        const filteredSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('activeCount')])
          .where({ name: { '!': null } })
          .groupBy(['store']);

        const params: unknown[] = [];
        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: filteredSubquery,
              alias: 'activeProducts',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params,
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "activeCount" FROM "products" WHERE "name" IS NOT NULL GROUP BY "store_id") AS "activeProducts" ON "stores"."id"="activeProducts"."store"',
        );
        expect(params).toStrictEqual([]);
      });

      it('should generate subquery join with parameterized WHERE clause', () => {
        const filteredSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('count')])
          .where({ name: 'Widget' })
          .groupBy(['store']);

        const params: unknown[] = [];
        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: filteredSubquery,
              alias: 'widgetCounts',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params,
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "count" FROM "products" WHERE "name"=$1 GROUP BY "store_id") AS "widgetCounts" ON "stores"."id"="widgetCounts"."store"',
        );
        expect(params).toStrictEqual(['Widget']);
      });

      it('should generate subquery join with multiple aggregates', () => {
        const multiAggSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select([
            'id',
            (sb): SelectAggregateExpression => sb.count().as('count'),
            (sb): SelectAggregateExpression => sb.sum('intColumn').as('total'),
            (sb): SelectAggregateExpression => sb.avg('intColumn').as('average'),
          ])
          .groupBy(['id']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: multiAggSubquery,
              alias: 'stats',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "id",COUNT(*) AS "count",SUM("int_column") AS "total",AVG("int_column") AS "average" FROM "kitchen_sink" GROUP BY "id") AS "stats" ON "stores"."id"="stats"."id"',
        );
      });

      it('should generate subquery join with default aggregate aliases', () => {
        const defaultAliasSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): AggregateBuilder => sb.count()])
          .groupBy(['store']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: defaultAliasSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "count" FROM "products" GROUP BY "store_id") AS "productStats" ON "stores"."id"="productStats"."store"');
      });

      it('should generate subquery join with default aliases for sum, avg, max, min', () => {
        const subq = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select([
            'id',
            (sb): AggregateBuilder => sb.sum('intColumn'),
            (sb): AggregateBuilder => sb.avg('intColumn'),
            (sb): AggregateBuilder => sb.max('intColumn'),
            (sb): AggregateBuilder => sb.min('intColumn'),
          ])
          .groupBy(['id']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: subq,
              alias: 'stats',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "id",SUM("int_column") AS "sum",AVG("int_column") AS "avg",MAX("int_column") AS "max",MIN("int_column") AS "min" FROM "kitchen_sink" GROUP BY "id") AS "stats" ON "stores"."id"="stats"."id"',
        );
      });

      it('should generate subquery join with distinct count without .as()', () => {
        const subq = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): AggregateBuilder => sb.count('name').distinct()])
          .groupBy(['store']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: subq,
              alias: 'stats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "store_id" AS "store",COUNT(DISTINCT "name") AS "count" FROM "products" GROUP BY "store_id") AS "stats" ON "stores"."id"="stats"."store"');
      });

      it('should support multiple ON conditions in subquery join', () => {
        const subq = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', 'name', (sb): SelectAggregateExpression => sb.count().as('count')])
          .groupBy(['store', 'name']);

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: subq,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store', name: 'name' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store","name",COUNT(*) AS "count" FROM "products" GROUP BY "store_id","name") AS "productStats" ON "stores"."id"="productStats"."store" AND "stores"."name"="productStats"."name"',
        );
      });

      it('should generate subquery join with HAVING clause and equals condition', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ productCount: 5 });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id" HAVING COUNT(*)=5) AS "productStats" ON "stores"."id"="productStats"."store"',
        );
      });

      it('should generate subquery join with HAVING clause and greater than condition', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ productCount: { '>': 10 } });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id" HAVING COUNT(*)>10) AS "productStats" ON "stores"."id"="productStats"."store"',
        );
      });

      it('should generate subquery join with HAVING clause and multiple comparison operators', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ productCount: { '>=': 5, '<=': 100 } });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id" HAVING COUNT(*)>=5 AND COUNT(*)<=100) AS "productStats" ON "stores"."id"="productStats"."store"',
        );
      });

      it('should generate subquery join with HAVING clause and not equals condition', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ productCount: { '!=': 0 } });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'productStats',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "store_id" AS "store",COUNT(*) AS "productCount" FROM "products" GROUP BY "store_id" HAVING COUNT(*)<>0) AS "productStats" ON "stores"."id"="productStats"."store"',
        );
      });

      it('should generate subquery join with HAVING on SUM aggregate', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select(['id', (sb): SelectAggregateExpression => sb.sum('intColumn').as('totalInt')])
          .groupBy(['id'])
          .having({ totalInt: { '>': 1000 } });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'stats',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(' INNER JOIN (SELECT "id",SUM("int_column") AS "totalInt" FROM "kitchen_sink" GROUP BY "id" HAVING SUM("int_column")>1000) AS "stats" ON "stores"."id"="stats"."id"');
      });

      it('should generate subquery join with HAVING on multiple aggregates', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select(['id', (sb): SelectAggregateExpression => sb.count().as('rowCount'), (sb): SelectAggregateExpression => sb.avg('intColumn').as('avgInt')])
          .groupBy(['id'])
          .having({ rowCount: { '>': 5 }, avgInt: { '>=': 50 } });

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: havingSubquery,
              alias: 'stats',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT "id",COUNT(*) AS "rowCount",AVG("int_column") AS "avgInt" FROM "kitchen_sink" GROUP BY "id" HAVING COUNT(*)>5 AND AVG("int_column")>=50) AS "stats" ON "stores"."id"="stats"."id"',
        );
      });

      it('should throw error for invalid HAVING operator', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          // @ts-expect-error - intentionally using invalid operator
          .having({ productCount: { 'DROP TABLE': 1 } });

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: havingSubquery, alias: 'stats', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError instanceof QueryError);
        expect(thrownError.message).toContain('Invalid HAVING operator');
      });

      it('should throw error for non-number HAVING value', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          // @ts-expect-error - intentionally using string value
          .having({ productCount: { '>': '1; DROP TABLE products;' } });

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: havingSubquery, alias: 'stats', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError instanceof QueryError);
        expect(thrownError.message).toContain('must be a finite number');
      });

      it('should throw error for Infinity HAVING value', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ productCount: { '>': Infinity } });

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: havingSubquery, alias: 'stats', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError instanceof QueryError);
        expect(thrownError.message).toContain('must be a finite number');
      });

      it('should throw error for unknown HAVING alias', () => {
        const havingSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('productCount')])
          .groupBy(['store'])
          .having({ unknownAlias: { '>': 5 } });

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: havingSubquery, alias: 'stats', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError instanceof QueryError);
        expect(thrownError.message).toContain('unknown alias');
      });

      it('should throw error for SQL injection in subquery join alias', () => {
        const subq = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('count')])
          .groupBy(['store']);

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: subq, alias: 'stats"; DROP TABLE products; --', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('Invalid SQL identifier');
      });

      it('should throw error for SQL injection in subquery join ON column', () => {
        const subq = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('count')])
          .groupBy(['store']);

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: subq, alias: 'stats', type: 'inner', on: { id: 'store"; DROP TABLE products; --' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('Invalid SQL identifier');
      });

      it('should throw error for SQL injection in aggregate alias', () => {
        const subq = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', (sb): SelectAggregateExpression => sb.count().as('count"; DROP TABLE products; --')])
          .groupBy(['store']);

        let thrownError: Error | undefined;

        try {
          sqlHelper.buildJoinClauses({
            repositoriesByModelNameLowered,
            model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
            joins: [{ subquery: subq, alias: 'stats', type: 'inner', on: { id: 'store' } }],
            params: [],
          });
        } catch (ex) {
          thrownError = ex as Error;
        }

        assert(thrownError);
        expect(thrownError.message).toContain('Invalid SQL identifier');
      });
    });

    describe('subquery distinctOn', () => {
      it('should generate DISTINCT ON clause in subquery join', () => {
        const distinctSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', 'name'])
          .distinctOn(['store'])
          .sort('store');

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: distinctSubquery,
              alias: 'latestProducts',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT DISTINCT ON ("store_id") "store_id" AS "store","name" FROM "products" ORDER BY "store_id") AS "latestProducts" ON "stores"."id"="latestProducts"."store"',
        );
      });

      it('should generate DISTINCT ON with multiple columns in subquery join', () => {
        const distinctSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select(['id', 'name', 'intColumn'])
          .distinctOn(['id', 'name'])
          .sort('id, name' as 'id');

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: distinctSubquery,
              alias: 'distinctItems',
              type: 'inner',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT DISTINCT ON ("id","name") "id","name","int_column" AS "intColumn" FROM "kitchen_sink" ORDER BY "id","name") AS "distinctItems" ON "stores"."id"="distinctItems"."id"',
        );
      });

      it('should generate DISTINCT ON with WHERE clause in subquery join', () => {
        const distinctSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store', 'name'])
          .where({ name: { '!': null } })
          .distinctOn(['store'])
          .sort('store');

        const params: unknown[] = [];
        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: distinctSubquery,
              alias: 'activeProducts',
              type: 'inner',
              on: { id: 'store' },
            },
          ],
          params,
        });

        expect(result).toBe(
          ' INNER JOIN (SELECT DISTINCT ON ("store_id") "store_id" AS "store","name" FROM "products" WHERE "name" IS NOT NULL ORDER BY "store_id") AS "activeProducts" ON "stores"."id"="activeProducts"."store"',
        );
        expect(params).toStrictEqual([]);
      });

      it('should generate DISTINCT ON with secondary sort in subquery join', () => {
        const distinctSubquery = subquery(repositoriesByModelNameLowered.kitchensink as IRepository<KitchenSink>)
          .select(['id', 'name', 'intColumn'])
          .distinctOn(['id'])
          .sort('id, intColumn desc' as 'id');

        const result = sqlHelper.buildJoinClauses({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          joins: [
            {
              subquery: distinctSubquery,
              alias: 'latestByInt',
              type: 'left',
              on: { id: 'id' },
            },
          ],
          params: [],
        });

        expect(result).toBe(
          ' LEFT JOIN (SELECT DISTINCT ON ("id") "id","name","int_column" AS "intColumn" FROM "kitchen_sink" ORDER BY "id","int_column" DESC) AS "latestByInt" ON "stores"."id"="latestByInt"."id"',
        );
      });

      it('should generate DISTINCT ON in WHERE IN subquery', () => {
        const distinctSubquery = subquery(repositoriesByModelNameLowered.product as IRepository<Product>)
          .select(['store'])
          .distinctOn(['store'])
          .sort('store');

        const { whereStatement, params } = sqlHelper.buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered.store.model as ModelMetadata<Store>,
          where: {
            id: { in: distinctSubquery },
          },
        });

        assert(whereStatement);
        expect(whereStatement).toBe('WHERE "id" IN (SELECT DISTINCT ON ("store_id") "store_id" FROM "products" ORDER BY "store_id")');
        expect(params).toStrictEqual([]);
      });
    });
  });
});
